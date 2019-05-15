const util = require('../util/util');
const errorHandler = require('../util/errormessage');
const leaderboard = require('./leaderboard');

const Discord = require('discord.js');
const Levenshtein = require('fast-levenshtein');

const RealUtil = require('util');

const http = require('http');

const deity     = '542772456507834398';
const immortal  = '542772781050494986';
const emperor   = '542773500222373889';
const king      = '542773610738089995';
const prince    = '542773602370715658';
const warlord   = '542774101014478878';
const chieftain = '542774298180452377';
const settler   = '542774526778540044';
const difficulties = [settler, chieftain, warlord, prince, king, emperor, immortal, deity];

const cmd_separator = ' ';
const cmd_forcelink = '.forcelink';
const cmd_forceregister = '.forceregister';
const cmd_forceregid = '.forceregid';

function GetChannelSubLog() { return util.getChannel(371831587001729036); }
function GetChannelReportHistory() { return util.getChannel(291753171942899713); }
function GetChannelReportsProcessed() { return util.getChannel(484882448115564584); }


// ONLY FOR TESTING
const querystring = require('querystring');

// SubType: 1 (SUBBING player)
// SubType: 2 (LEAVER player)
// GameType: [0] Diplo [1] War [2] Team
function GetGameType(id)
{
	if(id == 0) return "Diplo";
	else if(id == 1) return "War";
	else if(id == 2) return "Team";
	else if(id == 3) return "Duel";
	else return "N/A";
}

/*var test = [ 'B', 'C' ];
test.splice(0, 1, 'A', test[0]);
console.log(test);*/

function eloWin(ratingWinner, ratingLoser)
{
	// Note: for ELO winners and losers ... gain or respectively lose the same amount every time. However if something like glicko2 would be used this would be different
	return { winner: eloGame(ratingWinner, ratingLoser, 1), loser: eloGame(ratingLoser, ratingWinner, 0) };
}

function eloGame(ratingOne, ratingTwo, result)
{
	const w = 1 / ( 1 + Math.pow(10, (ratingTwo - ratingOne) / 400));
	return Math.round(32 * (result - w));
}

function getMatches(regxp, data)
{
	var i = 0;
	var result = [];
	
	var m;
	while((m = regxp.exec(data)) !== null)
	{
		result.push(m);
		++i;
	}
	
	return result;
}

function getCivs(arr)
{
	let result = [];
	
	for(const w of arr)
	{
		if(w.length == 0) continue;
		let solution = null;
		
		// /START/ Handle Normal Civs
		for(let j in util.civs)
		{
			const n = j.toLowerCase();
			const _ls = Levenshtein.get(w, n);
			
			if(solution == null || _ls < solution.ls)
			{
				solution = { civ: n, ls: _ls };
			}
		}
		// /END/ Handle Normal Civs
		
		// /START/ Exceptions for certain civs
		const exceptions = [
			{ e: 'aus', o: 'australia' },
			{ e: 'cleopatra', o: 'egypt' },
			{ e: 'dido', o: 'phoenicia' },
			{ e: 'dutch', o: 'netherlands' },
			{ e: 'gitarja', o: 'indonesia' },
			{ e: 'indo', o: 'indonesia' },
			{ e: 'montezuma', o: 'aztec' },
			{ e: 'shaka', o: 'zulu' },
			{ e: 'tamar', o: 'georgia' },
			{ e: 'usa', o: 'america' }
		];
		for(const m of exceptions)
		{
			const n = m.e;
			const _ls = Levenshtein.get(w, n);
			
			if(solution == null || _ls < solution.ls)
			{
				solution = { civ: m.o, ls: _ls };
			}
		}
		// /END/ Exceptions
				
		if(solution.ls * 2 <= w.length)
		{
			//console.log('[orig] ' + w + ' [matched] ' + solution.civ);
			result.push(solution.civ);
		}
	}
	
	return result;
}

class ReportBotModule
{
	constructor(allowedChannelId)
	{
		this.allowedChannelId = allowedChannelId;
		
		util.client.on('messageReactionAdd', (reaction, user) =>
		{
			if(reaction.message.channel.id != this.allowedChannelId) return; // only check reactions in #ranked_reporting
			//if(!reaction.message.channel.memberPermissions(user).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES, true)) return; // only allow game-reporters,admins,etc... to initiate
			///console.log('[attempt-parse]' + reaction.message.id);

			const isAdmin = reaction.message.channel.memberPermissions(user).has(Discord.Permissions.FLAGS.MANAGE_MESSAGES, true);
			const isDebugEmoji = reaction.emoji.id == null && reaction.emoji.name == '🇨';
			const isReportEmoji = reaction.emoji.id == null && reaction.emoji.name == '🇷';

			if(isDebugEmoji || (isAdmin && isReportEmoji))
			{
				let pm = new ParseMessage(reaction.message, user);
				pm.run(isDebugEmoji);
			}
		});
	}
}

class ParseMessage
{
	constructor(message, user)
	{
		this.message = message;
		this.user = user;

		this.host = null;
		this.type = null;
		
		this.error = errorHandler.create(user);

		//console.log('[mentions]' + message.mentions.members.size + '[msg]' + message.content);
		const lines = message.content.toLowerCase().split('\n');
		
		this.positions = [];
		
		for(const line of lines)
		{
			// @Moderator mention
			if(line.includes('<@&291753249361625089>')) continue;
			
			if(line.includes('type'))
			{
				if(this.type != null)
				{
					this.error.add('two game types specified. only one possible');
				}
				else
				{
					if(!this.assignType(line)) this.error.add('invalid game type [allowed] diplo, duel, war, team');
				}
			}
			
			// regxp is also used later down where cleanstr is, not just for getMatches
			const regxp = /<@!?(\d+)>/g;
			const matches = getMatches(regxp, line);
			
			if(matches.length != 0)
			{
				const groupMatch = matches[0][1];
				//for(const m of matches) console.log(m);
				
				if(line.includes('host'))
				{
					if(this.host != null)
					{
						this.error.add('two hosts specified. only one possible');
					}
					else if( message.mentions.users.get(groupMatch) == null )
					{
						// if we dont check for this the code will crash later (!)
						this.error.add('specified host not part of the reported game');
					}
					else
					{
						this.host = groupMatch;
					}
				}
				else
				{
					// This code is by no means perfect. Would probably be better to allow a-z0-9\s\!\<\>\@ and clean all others ?!
					const line_subs = line.replace(/[^a-z0-9\s\<\>\@]/g, '');
					//console.log('[line_subs] ' + line_subs);
					
					// Try both 'sub for' and 'subbed out'
					let matches_subs = getMatches(/<@(\d+)>[a-z0-9\s]*sub[a-z0-9\s]*for[a-z0-9\s]*<@(\d+)>/g, line_subs);
					if(matches_subs.length == 0) matches_subs = getMatches(/<@(\d+)>[a-z0-9\s]*subbed[a-z0-9\s]*out[a-z0-9\s]*<@(\d+)>/g, line_subs);
					
					if(matches_subs.length != 0)
					{
						/*console.log('----[subs]---');
						console.log(matches_subs);
						console.log('---[matches]--- ' + matches.length);
						console.log(matches);*/
						
						// set Subtypes on all players
						for(var m of matches_subs)
						{
							//console.log(m[1] + ' sub for ' + m[2]);
							for(var n of matches)
							{
								if(n[1] == m[1]) n.subType = 1;
								else if(n[1] == m[2]) n.subType = 2;
							}
						}						
					}
					else
					{
						if(line.includes('sub'))
						{
							/*const clean_subs = line.replace(/^[a-z0-9\s\@\<\>]/g, '');
							console.log('[line] ' + line);
							console.log('[clean] ' + clean_subs);*/
							this.error.add('SUB without FOR keyword in [line] ' + line);
						}
					}

					// set subType = 0 on all players that are not subs
					for(let m of matches)
					{
						if(!m.hasOwnProperty('subType')) m.subType = 0;
					}

					
					// first replace all regxp matches (user highlights) then get rid of anything that is neither a whitespace nor an roman character
					// cleanstr will be used for civ matches
					const cleanstr = line.replace(regxp, '').replace(/[^a-z\s]/g, '');
					// also replace 'sub' and 'for' ???
					//console.log('[clean]' + cleanstr);

					const civsMatched = getCivs( cleanstr.split(' '));
					//console.log('[matched]' + civsMatched);
					
					if(civsMatched.length == 0)
					{
						// ignore no-civs for reports ... ?
						for(var i = 0; i < matches.length; ++i)
						{
							matches[i].civ = null;
						}
					}
					else if(civsMatched.length != matches.length - matches_subs.length)
					{
						this.error.add('invalid amount of civs [' + civsMatched + '] found for [line] ' + line);
					}
					else
					{
						//match civs to matches
						var sub_offset = 0;
						for(var i = 0; i < matches.length; ++i)
						{
							if(matches[i].subType == 2) ++sub_offset;							
							matches[i].civ = civsMatched[i - sub_offset];
						}
					}
					
					// Push matches to positions
					this.positions.push(matches);
				}
			}
		}
        //for(const p of this.positions) console.log(p);
		
		if(this.host == null)
		{
			this.host = message.author.id;
			// need to check here or host could be resolved to null (!) later when constructing playerString
			if(message.mentions.users.get(this.host) == null) this.error.add('no host specified');			
		}
		
		if(this.type == null)
		{
			// Hail Mary
			if(this.assignType(message.content.toLowerCase())) { }
			else if(message.mentions.users.size == this.positions.length)
			{
				if(this.positions.length == 2)
				{
					this.type = 3; // 2 players, default to duel
				}
				else
				{
					this.type = 0; // default to FFA diplo
				}
			}
			else
			{
				this.type = 0; // default to FFA either way
				//this.error.add('no game type specified');
			}
		}
				
		/// Grab ratings for all players (codenaugh: not yet apparently)
		this.civCount = 0;
		this.civState = 0; //0=init, 1=null detected, 2=civ detected
		for(var i = 0; i < this.positions.length; ++i)
		{
			for(var m of this.positions[i])
			{
				if(this.civState == 0)
				{
					this.civState = m.civ == null ? 1 : 2;
				}
				else if((this.civState == 1 && m.civ != null) || (this.civState == 2 && m.civ == null))
				{
					this.error.add('error with player <@' + m[1] + '> :: a game can either have no civs or all players must have a reported civ');
				}
				
				++this.civCount;
			}
		}

		if(this.type == 3 && this.civCount != 2)
		{
			this.error.add('Duels can only score 2 players, not ' + this.civCount);
		}
		
		/*console.log('---[positions]---');
		console.log(this.positions);
		console.log('---[stats]---');
		for(var i = 0; i < this.positions.length; ++i)
		{
			for(var m of this.positions[i])
			{
				console.log(m.stats);
			}
		}*/
	}
	
	async run(debugMode)
	{
		// Construct Positions only for API
		let reportedPositions = [];
		for(let i = 0; i < this.positions.length; ++i)
		{
			let rp = [];
			for(let m of this.positions[i])
			{
				const civId = m.civ == null ? null : util.getCiv(m.civ).dbid;
				rp.push({id: m[1], civ: civId, sub: m.subType});
			}
			reportedPositions.push(rp);
		}
        //for (const x of reportedPositions) console.log(x);
		
		// Send to API
		let response = null;
		try
		{
			response = await util.makeRGRequest('report.php', {
				commit: debugMode ? 0 : 1,
				host: this.host,
				type: this.type,
				reported: this.message.createdTimestamp,
				r: JSON.stringify(reportedPositions)
			});
			
			let ratingChangesIndex = 0;
			
			for(let i = 0; i < this.positions.length; ++i)
			{
				for(var m of this.positions[i])
				{
					m.ratingChange = response.ratingChanges[ratingChangesIndex++];
				}
			}
		}
		catch(err)
		{
			this.error.add(err);
		}
		
		/// process all ELO games
		this.error.send(this.message.channel, 60).then( async(errors) =>
		{
			if(errors == false)
			{				
				if(!debugMode)
				{
					// Update Leaderboard
					leaderboard.generate();
					
					this.notify(response.id);
				}
				else	
				{
					this.error.isError = false;
					this.error.add('**[DEBUG MODE] No Errors Found**');
					this.error.add('**[Result]**\n' + this.notifyConstructPlayerString());
					this.error.send(this.message.channel, 30);	
				}			
			}
		});
	}
	
	async notify(gameid)
	{
		// construct new message with full changes
		let msg = '';
		msg += 'GameID: ' + gameid + '\n';
		msg += 'Type: ' + GetGameType(this.type) + '\n';
		msg += '⍟Host: ' + this.displayNameFromId(this.host) + '\n';
		
		// also delete original message?
		await this.message.delete();
		
		// COULD CRASH HERE, USER NOT FOUND, so we deleted above
		msg += this.notifyConstructPlayerString();

        if (msg.includes("**[ORIG]** "))
        {
            var sub = msg.split("**[ORIG]** ").pop().split(" ").shift();
            GetChannelSubLog().send(sub + " subbed");
        }
        /*const lines = msg.split('\n');
        for(const line of lines)
        {
            console.log("DEBUG: " + line);
            if(line.includes('[ORIG]'))
            {
                console.log('DEBUG: found "[ORIG]"');
                const words = line.split(' ');
                for (let i = 0; i < words.length; i++)
                {
                    console.log("DEBUG: " + words[i]);
                    if (words[i] == "for")
                    {
                        console.log('DEBUG: found "for"... next word is ' + words[i+1]);
                        GetChannelSubLog().send(words[i+1] + " subbed");
                        break;
                    }
                }
            }
        }*/

		GetChannelReportHistory().send(msg);
		GetChannelReportsProcessed().send(
			'Approved By: ' + this.user + '\n' +
			'Reported By: ' + this.message.author + '\n' + // FIX later: this.displayNameFromId(this.message.author.id)
			'GameID: ' + gameid + '\n' +
			'\n' + this.message.content
		);
        await applyTags(this.message.mentions.members.array());

		//GetChannelReportHistory().send(message);
	    this.error.add('-Report Finished Successfully-');
	    this.error.send(this.message.channel, 30);
	}
	
	notifyConstructPlayerString()
	{
		let msg = '';
		if(this.type == 2)
		{
			for(var i = 0; i < this.positions.length; ++i)
			{
				msg += '\n**Team ' + (i+1) + '**\n';
				for(var m of this.positions[i])
				{
					const displayName = this.displayNameFromM(m);					
					msg += (m.ratingChange > 0 ? '+' : '') + m.ratingChange + ' ' + displayName + (m.civ == null ? '' : ' ' + m.civ) + '\n';
				}
			}
		}
		else
		{
			for(var i = 0; i < this.positions.length; ++i)
			{
				const max_j = this.positions[i].length;
				for(var j = 0; j < max_j; ++j)
				{
					const m = this.positions[i][j];
					if(max_j != 1) msg += '(TIE ' + (i+1) + ') ';
					else msg += (i+1) + ': ';
					
					const displayName = this.displayNameFromM(m);
					msg += (m.ratingChange > 0 ? '+' : '') + m.ratingChange + ' ' + displayName + (m.civ == null ? '' : ' ' + m.civ) + '\n';
				}
			}
		}
		return msg;
	}
	
	displayNameFromM(m)
	{
		let displayName = this.displayNameFromId(m[1]);
		if(m.subType == 1) displayName = ' **[SUB]** ' + displayName;
		if(m.subType == 2) displayName = ' **[ORIG]** ' + displayName;
		return displayName;
	}
	displayNameFromId(id)
	{
		const user = this.message.mentions.users.get(id);
		const member = this.message.guild.member(user);
		return (user == null ? '**Deleted User**' : (member == null ? user.username : '<@' + id + '>'));
	}
	
	assignType(data)
	{
		if(data.includes('diplo') || data.includes('ffa')) this.type = 0;
		else if(data.includes('war')) this.type = 1;
		else if(data.includes('team') || /\dv\d/g.test(data)) this.type = 2;
		else if(data.includes('duel') || data.includes('adcp')) this.type = 3;
		
		return this.type != null;
	}
}

async function applyTags(players)
{
    for ( i in players )
    {
        let player = players[i];
        if (!player)
            continue;
        let playerStats = await util.makeRGRequest('stats.php', {
            id: player.id
        }).catch(console.error);
        if (!playerStats)
            continue;
        let skill = playerStats.rating;
        if (skill < 1500)
        {
            if ( !player.roles.has(settler) )
                await swapRoles(player, settler);
        }
        else if (skill >= 1500 && skill < 1600)
        {
            if ( !player.roles.has(chieftain) )
                await swapRoles(player, chieftain);
        }
        else if (skill >= 1600 && skill < 1700)
        {
            if ( !player.roles.has(warlord) )
                await swapRoles(player, warlord);
        }
        else if (skill >= 1700 && skill < 1800)
        {
            if ( !player.roles.has(prince) )
                await swapRoles(player, prince);
        }
        else if (skill >= 1800 && skill < 1900)
        {
            if ( !player.roles.has(king) )
                await swapRoles(player, king);
        }
        else if (skill >= 1900 && skill < 2000)
        {
            if ( !player.roles.has(emperor) )
                await swapRoles(player, emperor);
        }
        else if (skill >= 2000 && skill < 2100)
        {
            if ( !player.roles.has(immortal) )
                await swapRoles(player, immortal);
        }
        else if (skill >= 2100)
        {
            if ( !player.roles.has(deity) )
                await swapRoles(player, deity);
        }
    }
}

async function swapRoles(m, newRole)
{
    if (!m)
    {
        console.log("Error in swapRoles... member is null");
        return;
    }
    if (!newRole)
    {
        console.log("Error in swapRoles... newRole is null");
        return;
    }
    await m.removeRoles(difficulties).catch(console.error);
    await m.addRole(newRole).catch(console.error);
}

// #ranked_reporting
module.exports = new ReportBotModule(413532530268962816);
