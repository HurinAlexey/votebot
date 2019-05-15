const util = require('../util/util');
const mongoUtil = require('../util/mongo');

const errorHandler = require('../util/errormessage');
const leaderboard = require('./leaderboard');

const cmd_stats = '.stats';
const cmd_gstats = '.gstats';
const cmd_ratings = '.ratings';
const cmd_stats_reset = '.resetme';
const cmd_separator = ' ';

//const file_myleague = 'data/myleague.txt';

function GetBotCommands() { return util.getChannel(304782408526594049); }
function GetBotTesting()  { return util.getChannel(351127558143868928); }
function isBotChannel(channel) { return channel == GetBotCommands() || channel == GetBotTesting(); }

const error_formatting = "Formatting error! Either use **.stats** for your own stats or **.stats @discordUser** to check someone else's stats";

class StatsBotModule
{
	constructor()
	{
		util.client.on('message', message => { this.handle(message); });
	}
	
	async handle(message)
	{
		if(message.author.bot == true) return; // ignore bot messages
		if ( !isBotChannel(message.channel) ) return;
		
		const content = message.content.toLowerCase();
		if( content.startsWith(cmd_stats_reset) )
		{
			const cmd_stats_reset_confirm = ' i am sure';
			let error = errorHandler.create();

			if( content.toLowerCase() != cmd_stats_reset + cmd_stats_reset_confirm )
			{
				error.add('**' + cmd_stats_reset + '** has to be used as **' + cmd_stats_reset + cmd_stats_reset_confirm + '**\nYou get **one** reset per lifetime. This action **cannot** be reversed. Once you reset your stats they are gone forever. There is **no backup**.');
				error.send(message.channel, 30);
				return;
			}
			
			try
			{
				await util.makeRGRequest('reset.php', {
					id: message.author.id
				});
				
				error.add(message.author + ' your stats have been successfully reset.');
				error.send(message.channel, 60);
			}
			catch(err)
			{
				error.add(err);
				error.send(message.channel, 30);
			}
		}
		else if( content.startsWith(cmd_stats) )
		{
			let target = null;
			if(message.mentions.members.size == 0)
			{
				// usage on 'self'
				target = message.member;
			}
			else if(message.mentions.members.size == 1)
			{
				target = message.mentions.members.array().shift();
			}
			else
			{
				message.channel.send('The **' + cmd_stats + '** command cannot be used for more than one player');
				return;
			}
			
			if( !target ) // should never happen?!
			{
				console.log("CRASH_ERROR [content] " + content + " [mentions.members.size] " + message.mentions.members.size);
				return;
			}

			try
			{
				let s = await util.makeRGRequest('stats.php', {
					id: target.id
				});
				
				// Best Civs
				const max_i = s.bestcivs.length < 3 ? s.bestcivs.length : 3;
				let msgCivs = max_i != 0 ? '\n\n**__Best Civs__**' : '';
				for(let i = 0; i < max_i; ++i)
				{
					const c = s.bestcivs[i];
					
					let win_percentage = leaderboard.getWinPercentage(c.wins, c.losses).toString() + '%'; while(win_percentage.length < 3) win_percentage = ' ' + win_percentage;
					let wins = c.wins.toString(); while(wins.length < 4) wins = ' ' + wins;
					let losses = c.losses.toString(); while(losses.length < 4) losses += ' ';
					let civ_msg = wins + ' [' + win_percentage + '] ' + losses;
					
					msgCivs += '\n' + util.getCivEmojiByDBID(c.civ) + civ_msg;
					
					/// OLD
					/*msgCivs += '\n\n**__Best Civs__**\n';
					for(let i = 0; i < max_i; ++i)
					{
						const c = civsSorted[i];
						msgCivs += util.getCivEmoji(c.civ) + c.civ_msg + '\n';
					}
					
					msgCivs += '\n\n**__Worst Civs__**\n';
					for(let i = 0; i < max_i; ++i)
					{
						const c = civsSorted[civsSorted.length - max_i + i];
						msgCivs += util.getCivEmoji(c.civ) + c.civ_msg + '\n';
					}*/
				}
				
				message.channel.send(
					target + '\n\n' +
					'**__Stats__**\nLadder: **' + s.rank + '**\nRating: **' + s.rating + '**\nWinrate: **' + leaderboard.getWinPercentage(s.wins, s.losses) + '%**\n\n' +
					'**__Games History__**\nLifetime: **' + s.wins + '-' + s.losses + '**' +
					msgCivs
				);
			}
			catch(err)
			{
				let error = errorHandler.create();
				error.add(err);
				error.send(message.channel, 30);
			}
		}
        else if( content.startsWith(cmd_gstats) )
        {
            if ( message.channel != GetBotTesting()) return;

            let target = null;
            if(message.mentions.members.size == 0)
            {
                // usage on 'self'
                target = message.member;
            }
            else if(message.mentions.members.size == 1)
            {
                target = message.mentions.members.array().shift();
            }
            else
            {
                message.channel.send('The **' + cmd_stats + '** command cannot be used for more than one player');
                return;
            }

            if( !target ) // should never happen?!
            {
                console.log("CRASH_ERROR [content] " + content + " [mentions.members.size] " + message.mentions.members.size);
                return;
            }

            try
            {
                var player = await mongoUtil.getPlayer(target.id)
                var skill = player.rating;
                message.channel.send(
                    target + '\n\n' + '**__Stats__**\n**\nRating: **' + skill);
            }
            catch(err)
            {
                let error = errorHandler.create();
                error.add(err);
                error.send(message.channel, 30);
            }
        }
		else if( content.startsWith(cmd_ratings) )
		{
			let error = errorHandler.create();
			if(message.mentions.users.size == 0)
			{
				error.add('The **' + cmd_ratings + '** command needs to be used with atleast one player');
				error.send(message.channel, 30);
				return;
			}
			
			let query = { };
			message.mentions.users.forEach( (_value, _key) => { query[_key] = ''; });
			
			try
			{
				const response = await util.makeRGRequest('ratings.php', query);
				response.sort( (a,b) => { return a.rating < b.rating });
				
				let msg = '**__Ratings__**\n';
				for(let m of response) msg += util.getCivEmojiByDBID(m.civ) + ' <@' + m.id + '> [**' + m.rating + '**]\n';
				message.channel.send(msg);
				/*error.add(msg);
				error.isError = false;
				error.send(message.channel, 120);*/
			}
			catch(err)
			{
				error.add(err);
				error.send(message.channel, 30);
			}
		}
	}
}

module.exports = new StatsBotModule();
