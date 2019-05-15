const moduleRegister = require('./modules/register');
//const moduleReports = require('./modules/reports');
const moduleReports = require('./modules/glicko');
const moduleStats = require('./modules/stats');
const moduleSubs = require('./modules/subs');

//connect to mongoDB
const mongoUtil = require('./util/mongo');
mongoUtil.connectToMongo();

// login with the bot
const util = require('./util/util');
util.login_token('cpl');
