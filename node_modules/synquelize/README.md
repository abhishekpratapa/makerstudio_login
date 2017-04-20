# Synquelize

This is a synchronous wrapper using fibers for [Sequelize](http://sequelizejs.com).

The example code on the home page of Sequelize becomes:

```
var Synquelize = require('synquelize');

var synquelize = new Synquelize('database', 'username', 'password');

var User = synquelize.define('User', {
  username: Sequelize.STRING,
  birthday: Sequelize.DATE
});

Synquelize.run(function () {
  synquelize.sync();

  var jane = User.create({
    username: 'janedoe',
    birthday: new Date(1980, 6, 20)
  });

  console.log(jane.get({plain: true});
});
```
