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
	
	/// Call draft
	if ( vote.isTeamVote )
	{
		util.createDraft(2, Object.keys(util.civs), banned, async(err, result) =>
		{
			if(err)
			{
				await message.channel.send(err);
				return;
			}

			let msg = "**Team 1**\n";
			result[0].forEach( j => { msg += '<' + util.civs[j]['tag'] + util.civs[j]['id'] + '> ' + j + /*', '*/ '\n'; });
			await channel.send(msg);
			msg = "**Team 2**\n";
			result[1].forEach( j => { msg += '<' + util.civs[j]['tag'] + util.civs[j]['id'] + '> ' + j + /*', '*/ '\n'; });
			await channel.send(msg);
		});
	}
	else
	{
		util.createDraft(vote.users.length, Object.keys(util.civs), banned, async(err, result) =>
		{
			if(err)
			{
				await message.channel.send(err);
				return;
			}

			let msg = '**__Draft__**';
			await channel.send(msg);
			for(let i = 0; i < result.length; ++i)
			{
                msg = "<@" + vote.users[i].id + ">\n";
				result[i].forEach( j => { msg += '<' + util.civs[j]['tag'] + util.civs[j]['id'] + '> ' + j + /*', '*/ '\n'; });
				//msg = msg.slice(0, -2); // trailing comma removed
			
			    await channel.send(msg);
			}
		});
	}
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
			await firstMessage.edit('--- Голосование прервано, нужно чтобы все участники проголосовали ---');
		
			for(let m of vote.messages) await m.delete();
		}
	}
});

util.client.on('message', message =>
{
	const content = message.content;
	
	const isModVote = content.startsWith('.draft')
			  || content.startsWith('.modvote')
			  || content.startsWith('!draft')
			  || content.startsWith('!modvote');
	const isTeamVote = content.startsWith('.teamdraft')
			   || content.startsWith('!teamdraft');

	if( content.startsWith('.vote') || isModVote  || isTeamVote)
	{
		//get host and voice channel info
		const host = message.author;
		const vchannel = message.member.voiceChannel;
		if (!vchannel)
		{
            message.reply("You must be in a voicechannel to use the votebot!");
            return;
		}
		//grab list of players in voice channel that are not part of the game
		const notplaying = message.mentions.members.array();
		//add all game members (starting with host) to a mention message and a collection of users
		mentions = [];
		players = [];
		mentions.push("<@" + host.id + ">");
		players.push(host);
		vchannel.members.forEach(function(guildMember, guildMemberId) {
			if ( guildMember.user != host && !notplaying.includes(guildMember) ) {
				mentions.push("<@" + guildMemberId + ">");
				players.push(guildMember.user);
			}
		});
        if ( players.length < 2 )
        {
            message.channel.send("You need at least 2 players");
            return;
        }

		//create and send the message to tag everyone in the game
		playersMsg = "";
		mentions.forEach(function(player) {
			playersMsg = playersMsg.concat(" ", player);
		});
		message.channel.send(playersMsg);
		
		// Order members in the order of which they were mentioned in the message
		//const m = message.mentions.members.array();
		//const split = content.split(' ').splice(1);
		//let result = [];
		//let skipped = 0;
		//for(let j in split)
		//{
		//	if(split[j] == '')
		//	{
		//		++skipped;
		//		continue;
		//	}

		//	for(let i of m)
		//	{
		//		if(i == split[j])
		//		{
		//			// Eliminate Duplicates
		//			if(result.includes(i.user))
		//			{
		//				++skipped;
		//			}
		//			else
		//			{
		//				result[j - skipped] = i.user;
		//			}
		//			
		//			break;
		//		}
		//	}
		//}
		
		const bot_vote = voting.createVote(players);
		bot_vote.isModVote = isModVote;
		bot_vote.isTeamVote = isTeamVote;
		if( isModVote )
		{
			bot_vote.show(message.channel, '**__Мы благодарны серверу CPL за базу кода для создания данного бота__**');
		}
		
		if ( !isTeamVote )
		{
		// bot_vote.showChoice(message.channel, '**__Моды для игры__**\n',
		// 	new Map([
		// 		[":heavy_multiplication_x:", "Без модов"],
		// 		[":regional_indicator_t:", "Fast Dynamic Timer"],
		// 		[":regional_indicator_s:", "Better Balanced Start"],
		// 		[":regional_indicator_g:", "Better Balanced Game"]
		// 		[":regional_indicator_t: :regional_indicator_s:", "Timer + Start"]
		// 		[":regional_indicator_t: :regional_indicator_g:", "Timer + Game"]
		// 		[":regional_indicator_g: :regional_indicator_s:", "Game + Start"]
		// 	]), {} );

        // bot_vote.showChoice(message.channel, '**__Game Duration__**\n',
        //     new Map([
        //         ["4⃣", "4 Hours"],
        //         ["6⃣", "6 Hours"],
		// 		["➖", "No Limit"]
        //     ]), {} );

		// bot_vote.showChoice(message.channel, '**__Начальная Эра__**\n',
		// 	new Map([
		// 		["🇩", "Древний Мир"],
		// 		["🇦", "Античсность"],
		// 		["🇨", "Средневековье"],
		// 		["🇧", "Возрождение"],
		// 	]), {} );

		bot_vote.showChoice(message.channel, '**__Тип карты__**\n',
			new Map([
				["🇵", "Пангея"],
				["🇲", "Внутреннее море"],
				["🇨", "Континенты"],
				["🇦", "Архипелаг"],
				["🇭", "Архипелаги"],
				["🔀", "Случайно"],
				["🇫", "Фрактал"]
			]), {} );

        bot_vote.showChoice(message.channel, '**__Возраст мира__**\n',
            new Map([
				["🇭", "Новый"],
                ["🇨", "Стандарт"]
            ]), {} );

        bot_vote.showChoice(message.channel, '**__Стихийные бедствия__**\n',
            new Map([
				["0⃣", "Засуха"],
				["1⃣", "Иногда бывает дождь"],
				["2⃣", "Ливень"],
				["3⃣", "Штормит"],
				["4⃣", "Аппокалипсис"]
            ]), {} );

		bot_vote.showChoice(message.channel, '**__ГГешки__**\n',
			new Map([
				["🚫", "Нельзя атаковать"],
				["🇦", "Уничтожаем или захватываем все"],
				["1⃣", "Захват 1 остальные уничтожаем"],
				["2⃣", "Захват 2 остальные уничтожаем"],
			]), {} );
		}
		
		if( !isModVote && !isTeamVote )
		{
		// bot_vote.showChoice(message.channel, '**__Wonders__**\n',
		// 	new Map([
		// 		["🇦", { pre: "Apadana", post: "Apadana (**BANNED**)"}],
		// 		["🇻", { pre: "Venitian Arsenal", post: "Venitian Arsenal (**BANNED**)"}],
		// 		["🇲", { pre: "Mausoleum", post: "Mausoleum (**BANNED**)"}]
		// 	]), { multi: true, separator: '\n' });
		
		// bot_vote.showChoice(message.channel, '**__Religions__**\n',
		// 	new Map([
		// 		["🇨", { pre: "Crusader", post: "Crusader (**BANNED**)"}],
		// 		["🇩", { pre: "Defender of the Faith", post: "Defender of the Faith (**BANNED**)"}],
		// 		["🇫", { pre: "God of the Forge Pantheon", post: "God of the Forge Pantheon (**BANNED**)"}],
		// 		["🇭", { pre: "God of the Harvest Pantheon", post: "God of the Harvest Pantheon (**BANNED**)"}]
		// 	]), { multi: true, separator: '\n' });
		
		// CCG HERE
		// bot_vote.showChoice(message.channel, '**__Classical Era Great General Combat Bonus__**\n',
		// 	new Map([
		// 		["➖", "No ban"],
		// 		["➕", "The ban only refers to the use of the Classical Great Generals in a combat setting. You may use the Great General for its movement bonus, it's retire ability, and scouting the map."],
		// 		["🇦", "Classical GG In Borders Rules: You may not move a classical general unit out of your territory. If you capture or settle a city not connected to your empire you may teleport the GG to that city but it must remain within your borders. If a GG is suddenly not in your borders due to a city being taken it must retreat ASAP."],
		// 		["🇧", "Classical Great Generals cannot use it's combat bonus with Classical Era Units. Can be used with Medieval Era units."]]
		// 	), { separator: '\n' });
		}
		
		if ( !isTeamVote )
		{
		bot_vote.showChoice(message.channel, '**__Better Balanced Start__**\t\t',
				new Map([
					["➕", "С модом"],
					["➖", "Без мода"]
				]), {} );
		bot_vote.showChoice(message.channel, '**__Better Balanced Game__**\t\t',
			new Map([
				["➕", "С модом"],
				["➖", "Без мода"]
			]), {} );
		bot_vote.showChoice(message.channel, '**__Таймер__**\t\t',
			new Map([
				["➕", "Fast Dynamic Timer"],
				["➖", "Стандартный, но переодически добавлять время"]
			]), {} );

		// bot_vote.showChoice(message.channel, '**__Варвары__**\t\t',
		// 	new Map([
		// 		["➕", "С варварами"],
		// 		["➖", "Без варваров"]
		// 	]), {} );
			
		// bot_vote.showChoice(message.channel, '**__Ядерки__**\t\t\t\t',
		// 	new Map([
		// 		["➕", "Разрешены"],
		// 		["➖", "Запрещены"]
		// 	]), {} );

		// bot_vote.showChoice(message.channel, '**__Обмен драфтом__**\t',
		// 	new Map([
		// 		["➕", "Разрешен"],
		// 		["➖", "Запрещен"]
		// 	]), {} );
		}
		
		if ( isTeamVote )
		{
		/// Suggested Civ Bans
		suggestedCivs = new Map([
			/*[util.civs['Georgia']['id']],*/
			['🚫'],
			// [util.civs['Sumeria']['id']],
			// [util.civs['Nubia']['id']],
			// [util.civs['Cree']['id']]
		]);
		}
		else
		{
                /// Suggested Civ Bans
                suggestedCivs = new Map([
                        /*[util.civs['Georgia']['id']],*/
                        ['🚫']
                ]);
                }

		bot_vote.showChoice(message.channel, '**__Баны Наций__**\n', suggestedCivs, { separator: '\n', connector: ' ', multi: true, callback: (vote) =>
		{
			bot_vote.voteCivBans = vote;
			for(let i in util.civs) vote.setOption(util.civs[i]['id'], { post: i});
			vote.setOption('🚫', '');
		}});
		
		bot_vote.showFinal(message.channel, '**__Еще не проголосовали__**\n');
	}
});

util.client.on('messageReactionAdd', (reaction, user) => { voting.messageReactionAdd(reaction, user); });
util.client.on('messageReactionRemove', (reaction, user) => { voting.messageReactionRemove(reaction, user); });

util.login_token('vote');
