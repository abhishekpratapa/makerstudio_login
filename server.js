/************************************************/
/*                                              */
/* Project:     3Calibr API                     */
/*                                              */
/* Authors:     Abhishek Pratapa                */
/*              Will Young                      */
/*                                              */
/* Version      1.0 [Deployment]                */
/*                                              */
/* File:        server.js                       */
/*                                              */
/* Methods:     [NA]                            */
/*                                              */
/* Data:        [user_model]                    */
/*                                              */
/************************************************/


// deployment variables
var deployment = true;
var delete_data = false;

// Express import
var express = require('express');
var app = express();

// import sequalize, database management
var Sequelize = require('sequelize');

// Parser import
var bodyParser = require('body-parser');

// Token import
var jwt = require('jsonwebtoken');

// cookie parser
var cookieParser = require('cookie-parser');

// Debug Morgan import
var morgan = require('morgan');

// Database modeler import
var mongoose = require('mongoose');

// Import the checksum, to verify our tokens (extra security)
var checksum = require('checksum');

// Import basic authentication
var basicAuth = require('basic-auth');

// Import crypto
var crypto = require('crypto');

var sequalize;
var match;

if(!deployment){
	sequalize = new Sequelize("dawgtownusa", "dawgtown", "Madhavi#123", {
							host: "localhost",
							dialect:'postgres',

							pool: 	{
										max: 5,
										min: 0,
										idle: 10000
									}
						});

} else {
	match = process.env.DATABASE_URL.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)

	sequalize = 	new Sequelize(match[5], match[1], match[2], {
							dialect:  'postgres',
							protocol: 'postgres',
							port:     match[4],
							host:     match[3],
							logging: false,
							omitNull: true,
							dialectOptions: {
							    ssl: true
							}
						});
}

var User_db;
var Session_db;

function define_user(){

	return 	sequalize.define('User',	{		
				user_id: 	{
								type: Sequelize.INTEGER,
								primaryKey: true,
		    					autoIncrement: true
		    				},

		    	first_name: Sequelize.STRING,
				last_name: Sequelize.STRING,
								
				email: Sequelize.STRING,

				utEID: Sequelize.STRING,
				created: Sequelize.DATE,
				card_value: Sequelize.STRING,

				status:  Sequelize.ENUM('Undergraduate', 'Graduate', 'Professor', 'Other'),
				other_status: Sequelize.STRING,

				engineering_type: Sequelize.ENUM('Aerospace', 'Architectural', 'Mechanical', 'Electrical', 'Civil', 'Chemical', 'Biomedical', 'Petroleum', 'Geosystems', 'Other Engineering')

			},	{
				freezeTableName: true
			});
}

function define_session_user(user_id){
	
	var Session_defined = 	sequalize.define('Session',	{
								session_id: {
												type: Sequelize.INTEGER,
												primaryKey: true,
						    					autoIncrement: true
						    				},
						    	laser_cutter_value: Sequelize.BOOLEAN,
								three_d_printer_value: Sequelize.BOOLEAN,
								pcb_mill_value: Sequelize.BOOLEAN,
								cnc_mill_value: Sequelize.BOOLEAN,
								plasma_cutter_value: Sequelize.BOOLEAN,
								soldering_iron_value: Sequelize.BOOLEAN,
								desk_space_value: Sequelize.BOOLEAN,
								sewing_machine_value: Sequelize.BOOLEAN,
								stapler_value: Sequelize.BOOLEAN,
								tools_value: Sequelize.BOOLEAN,
								other_value: Sequelize.BOOLEAN,
								other_val_sent: Sequelize.STRING,
								level_checked: Sequelize.STRING,
								other_val_sent_2: Sequelize.STRING,
								created: Sequelize.DATE
							},	{
								freezeTableName: true
							});	

	Session_defined.belongsTo(user_id, {foreignKey: 'user_id'});

	return Session_defined;
}

if(delete_data){
	User_db = define_user();
	User_db.sync({force: true}).then(function(user){
		Session_db = define_session_user(user);
		Session_db.sync({force: true}).then(function(session){

		});
	});
}else{
	User_db = define_user();
	User_db.sync().then(function(user){
		Session_db = define_session_user(user);
		Session_db.sync().then(function(session){

		});
	});
}

// authentication function
var auth = function (req, res, next) {
	function unauthorized(res) {
		res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
		return res.send(401);
	};

	var user = basicAuth(req);

	if (!user || !user.name || !user.pass) {
		return unauthorized(res);
	};

	var new_password = crypto.createHash('sha256').update(user.pass).digest('base64'); 

	var correct_password = crypto.createHash('sha256').update("makerspacelogin").digest('base64'); 

	if (user.name === 'login@utmakerspace.co' && new_password === correct_password) {
		return next();
	} else {
		return unauthorized(res);
	};

};

// second authentication
var auth2 = function (req, res, next) {
	function unauthorized(res) {
		res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
		return res.send(401);
	};

	var user = basicAuth(req);

	if (!user || !user.name || !user.pass) {
		return unauthorized(res);
	};

	var new_password = crypto.createHash('sha256').update(user.pass).digest('base64'); 

	var correct_password = crypto.createHash('sha256').update("makerspacelogin").digest('base64'); 

	if (user.name === 'steve@utmakerspace.co' && new_password === correct_password) {
		return next();
	} else {
		return unauthorized(res);
	};

};

// port number
var port = ((deployment) ? (port = process.env.PORT || 80) : (port = process.env.PORT || 8090));

// app configurations
app.set('superSecret', "DD4CAB6D6045344DC80F8A283E3A10429E546775939AEEDAC8AD492A929BA89D");
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(morgan('dev'));
app.use(cookieParser("DD4CAB6D6045344DC80F8A283E3A10429E546775939AEEDAC8AD492A929BA89D"));

// static files
app.use("/css", express.static(__dirname + '/css'));
app.use("/img", express.static(__dirname + '/img'));
app.use("/fonts", express.static(__dirname + '/fonts'));

// get homepage
app.get("/", auth, function(req, res) {
	res.render("card_scan");
});

// secondary check page
app.post("/check_card", auth, function(req, res) {
	var check_card_value = req.body.card_val || req.params.card_val;

	if(check_card_value == null){
		res.render("card_scan");
	}else{
		return 	User_db.findOne( {where: {"card_value" : check_card_value }} ).then(function(users){
					if(users == null){
						res.render("new_user", {"card_value": check_card_value});
					}else{
						res.render("new_login", {"card_value": check_card_value});
					}
				});
	}

});

// create a new user
app.post("/new_user", auth, function(req, res) {
	
	var card_val = req.body.card_value || req.params.card_value;
	var first_name_val = req.body.first_name || req.params.first_name;
	var last_name_val = req.body.last_name || req.params.last_name;
	var email_val = req.body.email || req.params.email;
	var eid_val = req.body.eid || req.params.eid;
	var engineering_type_val = req.body.engineering_type || req.params.engineering_type;
	var level_checked_val = req.body.level_checked || req.params.level_checked;
	var other_val = req.body.other || req.params.other;

	var place_user_db = {
		"first_name": first_name_val,
		"last_name": last_name_val,
		"email": email_val,
		"utEID": eid_val,
		"created": ((new Date).getTime()),
		"card_value": card_val,
		"status": level_checked_val,
		"other_val": other_val,
		"engineering_type": engineering_type_val
	};

	return 	User_db.create(place_user_db).then(function(resp){
				res.render("new_login", {"card_value": card_val});
			});

});

// validate the login
app.post("/validate_login", auth, function(req, res) {

	var card_val = req.body.card_value || req.params.card_value;
	var laser_cutter_value = req.body.laser_cutter_value || req.params.laser_cutter_value;
	var three_d_printer_value = req.body.three_d_printer_value || req.params.three_d_printer_value;
	var pcb_mill_value = req.body.pcb_mill_value || req.params.pcb_mill_value;
	var cnc_mill_value = req.body.cnc_mill_value || req.params.cnc_mill_value;
	var plasma_cutter_value = req.body.plasma_cutter_value || req.params.plasma_cutter_value;
	var soldering_iron_value = req.body.soldering_iron_value || req.params.soldering_iron_value;
	var desk_space_value = req.body.desk_space_value || req.params.desk_space_value;
	var sewing_machine_value = req.body.sewing_machine_value || req.params.sewing_machine_value;
	var stapler_value = req.body.stapler_value || req.params.stapler_value;
	var tools_value = req.body.tools_value || req.params.tools_value;
	var other_value = req.body.other_value || req.params.other_value;
	var other_val_sent = req.body.other_val_sent || req.params.other_val_sent;
	var level_checked = req.body.level_checked || req.params.level_checked;
	var other_val_sent_2 = req.body.other_val_sent_2 || req.params.other_val_sent_2;

	return 	User_db.findOne( {where: {"card_value" : card_val }} ).then(function(users){
				var session_details = {
					"user_id" : users.get("user_id"),
					"laser_cutter_value" : laser_cutter_value,
					"three_d_printer_value" : three_d_printer_value,
					"pcb_mill_value" : pcb_mill_value,
					"cnc_mill_value" : cnc_mill_value,
					"plasma_cutter_value" : plasma_cutter_value,
					"soldering_iron_value" : soldering_iron_value,
					"desk_space_value" : desk_space_value,
					"sewing_machine_value" : sewing_machine_value,
					"stapler_value" : stapler_value,
					"tools_value" : tools_value,
					"other_value" : other_value,
					"other_val_sent" : other_val_sent,
					"level_checked" : level_checked,
					"other_val_sent_2" : other_val_sent_2,
					"created": ((new Date).getTime())
				}

				return 	Session_db.create(session_details).then(function(return_created){
							res.render("card_scan");
						});
			});

});

// GET the User CSV
app.get("/all_user.csv", auth2, function(req, res) {
	var csv_file = "user_id, first_name, last_name, email, utEID, created, status, other_status, engineering_type, laser_cutter_value, three_d_printer_value, three_d_printer_value, pcb_mill_value, cnc_mill_value, plasma_cutter_value, soldering_iron_value, desk_space_value, sewing_machine_value, stapler_value, tools_value, other_value, other_val_sent, level_checked, other_val_sent_2, created\n";

	return User_db.findAll().then(function(user){
		return Session_db.findAll().then(function(sessions){
			console.log(user.length)

			for(var x = 0; x < user.length; x++){
				for(x = s = 0; s < sessions.length; s++){
					if(sessions[s].get("user_id") == user[x].get("user_id")){
						csv_file = csv_file + user[x].get("user_id") + "," + user[x].get("first_name") + "," + user[x].get("last_name") + "," + user[x].get("email") + "," + user[x].get("utEID") + "," + user[x].get("created") + "," + user[x].get("status") + "," + user[x].get("other_status") + "," + user[x].get("engineering_type") + "," + sessions[s].get("laser_cutter_value") + "," + sessions[s].get("three_d_printer_value") + "," + sessions[s].get("pcb_mill_value") + "," + sessions[s].get("cnc_mill_value") + "," + sessions[s].get("plasma_cutter_value")+ "," + sessions[s].get("soldering_iron_value") + "," + sessions[s].get("desk_space_value") + "," + sessions[s].get("sewing_machine_value") + "," + sessions[s].get("stapler_value") + "," + sessions[s].get("tools_value") + "," + sessions[s].get("other_value") + "," + sessions[s].get("other_val_sent") + "," + sessions[s].get("level_checked") + "," + sessions[s].get("other_val_sent_2") + "," + sessions[s].get("created") + "\n";
					}
				}
			}
			res.setHeader('Content-disposition', 'attachment; filename=all_user.csv');
			res.header("Content-Type", "text/csv");
			return res.send(csv_file);
		});
	});
});


app.listen(port);
console.log('Magic happens at http://localhost:' + port);