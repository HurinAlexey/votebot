const util = require('./util/util');

const err_formatting = 'Formatting Error. You may have forgotten the -, please try again.\nBase Command: **.draft** --- Example: **.draft-6.Sumeria.Scythia.Australia**\nBase Command: **.draftteam** Example (4v4): **.draftteam-8.2**';

process.on("uncaughtException", (err) => {
  console.log("draftbot " +  err);
});

// create an event listener for messages
util.client.on('message', message =>
{ 
	let content = message.content;
	if(content.startsWith(".draftteam"))
	{
		const contentSplit = content.split('-');
		if(contentSplit.length != 2)
		{
			message.channel.send(err_formatting)
			return;
		}
		
		let options = contentSplit[1].split('.');
		if(options.length != 2)
		{
			message.channel.send(err_formatting)
			return;
		}
		
		let playerCount = parseInt( options[0] );
		let teamCount = parseInt( options[1] );
		if( playerCount % teamCount != 0)
		{
			if(teamCount % playerCount != 0)
			{
				message.channel.send("Error: playerCount not divisible by teamCount");
				return;
			}
			
			// Wrong order. Swap them around for the people
			[playerCount, teamCount] = [teamCount, playerCount];
		}
		
		// Shuffle Players
		let players = [];
		for(let i = 1; i <= playerCount; ++i) players.push( i );
		util.shuffle(players);		
		
		/*let msg = '';
		const perTeam = playerCount / teamCount;
		for(let i = 0; i < teamCount; ++i)
		{
			msg += '**Team ' + (i+1) + '** ';
			for(let j = 0; j < perTeam; ++j)
			{
				msg += players[i*perTeam+j] + ', ';
			}
			msg = msg.slice(0,-2) + '\n'; // remove trailing ', '
		}*/
		
		let msg = '';
		const numbers = [ '0⃣ ', '1⃣ ', '2⃣ ', '3⃣ ', '4⃣ ', '5⃣ ', '6⃣ ', '7⃣ ', '8⃣ ', '9⃣ ', '🔟', '🇦', '🇧', '🇨', '🇩', '🇪', '🇫' ];
		const perTeam = playerCount / teamCount;
		for(let i = 1; i <= playerCount; ++i)
		{
			const pos = Math.floor((players.indexOf(i)) / perTeam) + 1;
			msg += '**Player** ' + numbers[i] + ' **Team ** ';
			for(let j=1; j < pos; ++j) msg += '      ';
			msg += numbers[pos] + '\n'; 
		}
		message.channel.send(msg);
	}
	else if(content.startsWith(".draft"))
	{
		const contentSplit = content.split('-');
		if(contentSplit.length != 2)
		{
			message.channel.send(err_formatting)
			return;
		}
		
		let banned = contentSplit[1].split('.');
		if(banned.length < 1)
		{
			message.channel.send(err_formatting)
			return;
		}

		// Extract playerCount
		const playerCount = parseInt( banned.shift() );
        if (playerCount == 1)
        {
            message.channel.send("draft-1 is being re-worked... please choose a number greater than 1");
            return;
        }

		util.createDraft(playerCount, Object.keys(util.civs), banned, (err, result) =>
		{
			if(err)
			{
				message.channel.send(err);
				return;
			}

			//let currMsg = "Draft called for by: " + message.author + '\n';
			let msg = "Draft called for by: " + message.author + '\n';
            message.channel.send(msg);
			for(let i = 0; i < result.length; ++i)
			{
				msg = " \n**Player " + (i+1) + "**\n";
				result[i].forEach( j => { msg += '<' + util.civs[j]['tag'] + util.civs[j]['id'] + '> ' + j + /*', '*/ '\n'; });
                message.channel.send(msg);
				//let nextMsg = " \n**Player " + (i+1) + "**\n";
				//result[i].forEach( j => { nextMsg += '<' + util.civs[j]['tag'] + util.civs[j]['id'] + '> ' + j + /*', '*/ '\n'; });
                /*if (currMsg.length + nextMsg.length > 1980)
                {
                    message.channel.send(currMsg);
                    currMsg = nextMsg;
                }
                else
                    currMsg += nextMsg;*/
			}
			//message.channel.send(currMsg);
		});
	}
});

// login with the bot
util.login_token('draft');
