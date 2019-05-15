const util = require('./util/util');
const rc = require('./util/reactioncontrol');
const voting = require('./util/voting');

/// Register civs as custom emojis
for(let i in util.civs) voting.setCustomEmoji(util.civs[i]['tag'], util.civs[i]['id']);

/// Set Vote Timeout to 30min
voting.setGlobalTimeout(1800);
//voting.setGlobalTimeout(60); //debug: 10 seconds

voting.on('finished', async(vote, channel) =>
{	
	/// Parse results to actual bans
	const results = vote.voteCivBans.getResults();
	let banned = [];
	for(let i of results)
	{
		for(let j in util.civs)
		{
			if(util.civs[j]['id'] == i)
			{
				banned.push( j );
				break;
			}
		}
	}
	
	/*if(vote.isModVote && !banned.includes('Rome'))
	{
		banned.push('Rome');
	}*/
	
	/// Call draft
	util.createDraft(vote.users.length, Object.keys(util.civs), banned, async(err, result) =>
	{
		if(err)
		{
			await message.channel.send(err);
			return;
		}

		let msg = '**__Draft__**';
		for(let i = 0; i < result.length; ++i)
		{
			msg += "\n**" + vote.users[i].username + "**   \n";
			result[i].forEach( j => { msg += '<' + util.civs[j]['tag'] + util.civs[j]['id'] + '> ' + j + /*', '*/ '\n'; });
			//msg = msg.slice(0, -2); // trailing comma removed
		}
		
		await channel.send(msg);
	});
});

voting.on('timeout', async(vote) =>
{
	/// Cleanup only if the vote did not finish
	if( !vote.finished )
	{
		/// Loop through all messages and delete them. Edit the first message to reflect this
		if(vote.messages.length != 0)
		{
			const firstMessage = vote.messages.shift();
			await firstMessage.edit('--- This vote was deleted due to inactivity ---');
		
			for(let m of vote.messages) await m.delete();
		}
	}
});

util.client.on('message', message =>
{
	const content = message.content;
	
	/// info
	const isModVote = content.startsWith('.votemod ');
	if( content.startsWith('.vote ') || isModVote )
	{
		if(message.mentions.users.size < 2)
		{
			message.channel.send('Error: A game needs to have at least 2 players');
			return;
		}
		
		// Order members in the order of which they were mentioned in the message
		const m = message.mentions.members.array();
		const split = content.split(' ').splice(1);
		let result = [];
		let skipped = 0;
		for(let j in split)
		{
			if(split[j] == '')
			{
				++skipped;
				continue;
			}

			for(let i of m)
			{
				if(i == split[j])
				{
					// Eliminate Duplicates
					if(result.includes(i.user))
					{
						++skipped;
					}
					else
					{
						result[j - skipped] = i.user;
					}
					
					break;
				}
			}
		}
		
		const bot_vote = voting.createVote(result);
		bot_vote.isModVote = isModVote;
		bot_vote.show(message.channel, "__**Please ensure that you are aware of any recent changes in**__ <#291753211189264416>.\nThese game options are __**disabled by default**__, majority vote to allow:\n- Siege Towers and/or Battering Rams with non-classical/non-medieval units\n**__Please ask the host to outline the rules of an option if you are uncertain.__**");
		if( isModVote )
		{
			bot_vote.show(message.channel, '**__Modded Game__** - This game is played with a balance mod, please download it here: https://steamcommunity.com/sharedfiles/filedetails/?id=1368312893');
		}
		
		bot_vote.showChoice(message.channel, '**__CC Voting__** ',
			new Map([
				["➕", "Normal"],
				["➖", "Unanimous Only"]
			]), {} );

		bot_vote.showChoice(message.channel, '**__Game Mode__**             ',
			new Map([
				["🇩", "Diplo"],
				["➕", "Diplo+"],
				["🇼", "Always War"],
				["🇵", "Always Peace"]
			]), {} );
		
		if( !isModVote )
		{
		bot_vote.showChoice(message.channel, '**__Turn Length__**             ',
			new Map([
				["🇦", 150],
				["🇧", 165],
				["🇨", 180],
				["🇩", "Dynamic. T[1-49] 120s T[50-89] 180s T[90+] 210s"]
			]), {} );
		}
		
		bot_vote.showChoice(message.channel, '**__Starting Era__**             ',
			new Map([
				["🇦", "Ancient"],
				["🇨", "Classical"],
				["🇲", "Medieval"],
				["🇷", "Renaissance"],
				["🇮", "Info"]
			]), {} );
			
		bot_vote.showChoice(message.channel, '**__Map Type__**                 ',
			new Map([
				["🇦", "Archipelago"],
				["🇨", "Continents"],
				["🇫", "Fractal"],
				["🇸", "Inland Sea"],
				["🇮", "Islands"],
				["🇵", "Pangaea"],
				["🔀", "Shuffle"]
			]), {} );
			
		bot_vote.showChoice(message.channel, '**__City State (CS)__**        ',
			new Map([
				["➖", "0 CS"],
				["➕", "Normal"],
				["🇷", "Raze Only"],
				["1⃣", "1 Capture (Raze rest)"],
				["2⃣", "2 Capture (Raze rest)"]
			]), {} );
		
		if( !isModVote )
		{
		bot_vote.showChoice(message.channel, '**__Wonders__**           \n',
			new Map([
				["🇦", { pre: "Apadana", post: "Apadana (**BANNED**)"}],
				["🇻", { pre: "Venitian Arsenal", post: "Venitian Arsenal (**BANNED**)"}],
				["🇲", { pre: "Mausoleum", post: "Mausoleum (**BANNED**)"}]
			]), { multi: true, separator: '\n' });
		
		bot_vote.showChoice(message.channel, '**__Religions__**           \n',
			new Map([
				["🇨", { pre: "Crusader", post: "Crusader (**BANNED**)"}],
				["🇩", { pre: "Defender of the Faith", post: "Defender of the Faith (**BANNED**)"}],
				["🇫", { pre: "God of the Forge Pantheon", post: "God of the Forge Pantheon (**BANNED**)"}],
				["🇭", { pre: "God of the Harvest Pantheon", post: "God of the Harvest Pantheon (**BANNED**)"}]
			]), { multi: true, separator: '\n' });
		
		// CCG HERE
		bot_vote.showChoice(message.channel, '**__Classical Era Great General Combat Bonus__**\n',
			new Map([
				["➖", "No ban"],
				["➕", "The ban only refers to the use of the Classical Great Generals in a combat setting. You may use the Great General for its movement bonus, it's retire ability, and scouting the map."],
				["🇦", "Classical GG In Borders Rules: You may not move a classical general unit out of your territory. If you capture or settle a city not connected to your empire you may teleport the GG to that city but it must remain within your borders. If a GG is suddenly not in your borders due to a city being taken it must retreat ASAP."],
				["🇧", "Classical Great Generals cannot use it's combat bonus with Classical Era Units. Can be used with Medieval Era units."]]
			), { separator: '\n' });
		}
		
		bot_vote.showChoice(message.channel, '**__Barbarians__**                ',
			new Map([
				["➕", "Banned"],
				["➖", "Not Banned"]
			]), {} );
			
		bot_vote.showChoice(message.channel, '**__City Trading__**                ',
			new Map([
				["➕", "Banned"],
				["➖", "Not Banned"]
			]), {} );
		
		bot_vote.showChoice(message.channel, '**__Nukes__**                         ',
			new Map([
				["➕", "Banned"],
				["➖", "Not Banned"]
			]), {} );
			
		/// Suggested Civ Bans
		const suggestedCivs = new Map([
			/*[util.civs['Georgia']['id']],*/
			['🚫']
		]);
		
		bot_vote.showChoice(message.channel, '**__Civ Bans__**\n', suggestedCivs, { separator: '\n', connector: ' ', multi: true, callback: (vote) =>
		{
			bot_vote.voteCivBans = vote;
			for(let i in util.civs) vote.setOption(util.civs[i]['id'], { post: i});
			vote.setOption('🚫', '');
		}});
		
		bot_vote.showFinal(message.channel, '**__Waiting For__**\n');
	}
});

util.client.on('messageReactionAdd', (reaction, user) => { voting.messageReactionAdd(reaction, user); });
util.client.on('messageReactionRemove', (reaction, user) => { voting.messageReactionRemove(reaction, user); });

util.login_token('game');
