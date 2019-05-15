const util = require('./util/util');

var moderatorId = '291753249361625089';
var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

util.client.on('message', function(message)
{
	var CronJob = require('cron').CronJob;
	if ( message.content.startsWith(".tournamentgame") && message.member.roles.has(moderatorId) )
	{
		eastern  = new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
		estTime  = new Date(eastern);
		estYear  = estTime.getFullYear();
		estMonth = estTime.getMonth();
		estDay   = estTime.getDate();
		estHour  = estTime.getHours();
		estMin   = estTime.getMinutes();
		europe   = new Date().toLocaleString("en-US", {timeZone: "Europe/Paris"});
		cetTime  = new Date(europe);
		cetYear  = cetTime.getFullYear();
		cetMonth = cetTime.getMonth();
		cetDay   = cetTime.getDate();
		cetHour  = cetTime.getHours();
		cetMin   = cetTime.getMinutes();

		var contentSplit = message.content.split(' ');
		if(contentSplit.length != 2)
		{
			message.channel.send("error: awaiting this format XX:XX");
			return;
		}
		else
		{
			var options = contentSplit[1].split(':');
			if( options.length < 2 || options[0].length != 2 || options[1].length != 2 ){
				message.channel.send("error: awaiting this format XX:XX");
				return;
			}
			if (options[0] && options[1])
			{
				var hour = options[0];
				var min = options[1];
				if ( hour < 18 )
					cetHour = +hour + 6;
				else
				{
					cetHour = hour - 18;
					cetTime.setDate(cetTime.getDate() + 1);
					cetDay = cetTime.getDate();
				}
				if ( estDay < 10 )
					estDay = "0" + estDay;
				if ( cetDay < 10 )
					cetDay = "0" + cetDay;
				if ( estHour < 10 )
					estHour = "0" + estHour;
				if ( cetHour < 10 )
					cetHour = "0" + cetHour;
				var msgHeader = "__**Tournament Announcement**__\n";
				var msgAnnounce = "A tournament game is scheduled for today!\n";
				var msgDetail =  "```The game is scheduled to start at:\n"
						 + months[estMonth] + " " + estDay + " " + estYear + "\t" + hour +":"+ min +" EST\n"
						 + months[cetMonth] + " " + cetDay + " " + cetYear + "\t" + cetHour +":"+ min + " CET```"
						 + "Hit the :heavy_plus_sign: if you are interested in playing.";
				var fullMsg = msgHeader + msgAnnounce + msgDetail;
				message.channel.send(fullMsg).then(function (message) {
					message.react("➕");
				});
				console.log('* '+ min +' '+ hour +' * * *');
				console.log('game at '+ hour +':'+ min);

				// 1 hour reminder
				if ( estHour > hour )
					var gameHour = hour + 24;
				else
					var gameHour = hour;
				var hourDiff = gameHour - estHour;
				console.log("hourDiff = " + hourDiff);
				console.log("estMin = " + estMin);
				console.log("min = " + min);
				if ( (hourDiff > 1) || (hourDiff == 1 && estMin < min) )
				{
					var reminderHour = ( (hour > 0) ? hour-1 : 23 );
					console.log("setting 1 hour reminder for " + reminderHour + ":" + min);
					new CronJob('* '+ min +' '+ reminderHour +' * * *', function() {
						message.channel.send("The tournament game will be starting in 1 hour. If you are playing in the game, please join the staging voice channel named 'Championship' soon");
						this.stop();
					}, null, true, 'America/New_York');
				}

				// 5 minute reminder
				if ( min > 5 )
				{
					var reminderHour = hour;
					var reminderMin = min - 5;
				}
				else
				{
					var reminderMin = +min + 55;
					if ( hour > 0 )
						var reminderHour = hour-1;
					else
						var reminderHour = 23;
				}
				console.log("setting 5 minute reminder for " + reminderHour + ":" + reminderMin);
				new CronJob('* '+ reminderMin +' '+ reminderHour +' * * *', function() {
			  		message.channel.send("The tournament game will start very very soon. Please join the voice staging room 'Championship' ASAP");
					this.stop();
				}, null, true, 'America/New_York');
			}
		}
	}
});

util.login_token('schedule');
