var assert = require('assert');
var Synquelize = require('./index');
var Sequelize = require('sequelize');

var userNames = ['John', 'Bill'];
var surname = ' Jackson';

describe('Synquelize', function () {
  var synquelize, User;

  beforeEach(function () {
    synquelize = new Synquelize('test.db', '', '', {dialect: 'sqlite'});
    User = synquelize.define('user', {
      name: {
        type: Synquelize.STRING,
        field: 'name',
        unique: true
      }
    });
    User.sync({force: true});
    userNames.forEach(function (name) { User.create({name: name}); });
  });

  it('must create and update instances', function () {
    assert.equal(User.findOne({where: {name: userNames[0]}}).name, userNames[0]);
    var users = User.findAll();
    assert.equal(users.length, userNames.length);
    for (var i = 0; i < users.length; ++i) {
      assert.equal(users[i].name, userNames[i]);
      users[i].name += surname;
      users[i].save();
      assert.equal(users[i].name, userNames[i] + surname);
    }
  });

  it('must throw errors', function () {
    var NoSuch = synquelize.define('no_such_table', {});
    assert.throws(
      function () { NoSuch.findAll(); },
      Sequelize.DatabaseError);
    assert.throws(
      function () { User.create({name: userNames[0]}); },
      Sequelize.UniqueConstraintError);
  });
});
