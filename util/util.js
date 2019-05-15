// the token of your bot - https://discordapp.com/developers/applications/me
//const token = 'Mzk5NTA4ODc2MTk5OTg1MTUy.DTOHUA.3S2EiWmg_09y9oOoQnkDcbYwZMk';

/// duplicate of C6Util::loadJSON
const _fs = require('fs');
const tokens = JSON.parse(_fs.readFileSync('./data/tokens.json', 'utf8').replace(/^\uFEFF/, ''));

// permission URL
//https://discordapp.com/oauth2/authorize?&client_id=292577703851196416&scope=bot&permissions=268561430

// create an instance of a Discord Client, and call it bot
const Discord = require('discord.js');
const http = require('http');
const querystring = require('querystring');

process.on('unhandledRejection', error => {
	console.log('[Fatal Unhandled Rejection]');
	console.log(error);
});

class C6Util
{
	constructor()
	{
		this.client = new Discord.Client();
		// the ready event is vital, it means that your bot will only start reacting to information from Discord _after_ ready is emitted.
		this.client.on('ready', () => { console.log('Ready!'); });
		this.client.on('error', (error) => { console.log('-[DiscordError]-'); console.log(error); });
		
		///
		// Listen for older-message reactions
		///
		const events = {
			MESSAGE_REACTION_ADD: 'messageReactionAdd',
			MESSAGE_REACTION_REMOVE: 'messageReactionRemove',
		};

		this.client.on('raw', async(ev) =>
		{
			if (!events.hasOwnProperty(ev.t)) return;
			
			const data = ev.d;
			const user = this.client.users.get(data.user_id);
			const channel = this.client.channels.get(data.channel_id) || await user.createDM();

			if (channel.messages.has(data.message_id)) return;
			const message = await channel.fetchMessage(data.message_id);
			
			const emojiKey = (data.emoji.id) ? `${data.emoji.name}:${data.emoji.id}` : data.emoji.name;
			const reaction = message.reactions.get(emojiKey);
			
			this.client.emit(events[ev.t], reaction, user);
		});
		///
		// /END/ older-message reaction support
		///
		
		this.fs = require('fs');

		this.civs = this.loadJSON('./data/civs.json');
		const civs_rf = this.loadJSON('./data/civs_rf.json');
		const civs_gs = this.loadJSON('./data/civs_gs.json');
		for(let key in civs_rf) { this.civs[key] = civs_rf[key]; }
		for(let key in civs_gs) { this.civs[key] = civs_gs[key]; }
	}
	login()
	{
		this.client.login(token['default']);
	}
	login_token(t)
	{
		this.client.login(tokens[t]);
	}

	loadJSON(file)
	{
		return JSON.parse(this.readFile(file));
	}
	
	saveJSON(file, data)
	{
		this.openWriteStream(file).then(stream =>
		{
			stream.write(JSON.stringify(data));
			stream.end();
		});
	}
	
	async openWriteStream(file)
	{
		return new Promise((resolve) => {
			const stream = this.fs.createWriteStream(file);
			stream.once('open', (fd) =>
			{
				resolve(stream);
			});
		});
	}
	
	readFile(file)
	{
		return this.fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
	}
	
	/*async readFile(file)
	{
		return new Promise((resolve, reject) =>
		{
			util.fs.access(file, (err) => 
			{
				// file doesn't exist
				if(err) reject(err);

				util.fs.readFile(file, (err, data) =>
				{
					if (err) throw err; // reject? :)
				}
			}
		}
	}*/

	shuffle (a)
	{
		for (let i = a.length - 1; i > 0; --i)
		{
			let j = Math.floor(Math.random() * (i + 1))
			let t = a[i];
			a[i] = a[j];
			a[j] = t;
		}
	}

	createDraft(playerCount, allowed, banned, callback)
	{
		for(let i = 0; i < banned.length; ++i) 
		{
			if( !allowed.includes(banned[i]) )
			{
				callback("There was either a typo, or the following civ was banned twice: " + banned[i]);
				return;
			}
		
			// Remove banned civ from allowed
			allowed = allowed.filter( e => e !== banned[i] );
		}

		if(playerCount == 2)
		{
			this.createDraftTeam(allowed, banned, callback);
			return;
		}
		    
		// const perPlayer = Math.floor(allowed.length / 2);
		const perPlayerAllCivs = Math.floor(allowed.length / 2);
		const perPlayer = perPlayerAllCivs < 4 ? perPlayerAllCivs : 4;
		
		if (perPlayer == 0)
		{
			callback("There were not enough civs left to allocate atleast one civ per player");
			return;
		}

		// randomize the civs and pop off the top
		this.shuffle(allowed);

		let result = [];
		for (let i = 0; i < playerCount; i++)
		{
			let inner = [];
			for(let j = 0; j < perPlayer; ++j)
			{
				inner.push(allowed[i*perPlayer + j]);
			}
			inner.sort( (a,b) => a < b ? -1 : 1 );
			result.push(inner);
		}

		callback(null, result);
	}
	
	createDraftTeam(allowed, banned, callback)
	{		
		/// Split civs fairly
		let split1 = [], split2 = [];
		this.createSplit(allowed, split1, split2, 'Gorgo', 'Pericles');
		this.createSplit(allowed, split1, split2, 'Gandhi', 'Chandragupta');
		this.createSplit(allowed, split1, split2, 'England', 'Indonesia');
		this.createSplit(allowed, split1, split2, 'Australia', 'Netherlands');
		this.createSplit(allowed, split1, split2, 'Japan', 'Norway'); //needs revision
		// brazil? -where?
		/// end split

		const perPlayer = Math.floor(allowed.length / 2);
		// const perPlayerAllCivs = Math.floor(allowed.length / 2);
		// const perPlayer = perPlayerAllCivs < 4 ? perPlayerAllCivs : 4;

		if (perPlayer == 0)
		{
			callback("There were not enough civs left to allocate atleast one civ per player");
			return;
		}
		
		// randomize the civs and pop off the top
		this.shuffle(allowed);

		let result = [ split1, split2 ];
		for (let i = 0; i < 2; i++)
		{
			for(let j = 0; j < perPlayer; ++j)
			{
				result[i].push(allowed[i*perPlayer + j]);
			}
			result[i].sort( (a,b) => a < b ? -1 : 1 );
		}

		callback(null, result);
	}
	createSplit(allowed, split1, split2, civ1, civ2)
	{
		if(allowed.includes(civ1) && allowed.includes(civ2))
		{
			allowed.splice(allowed.indexOf(civ1), 1);
			allowed.splice(allowed.indexOf(civ2), 1);

			const b = Math.floor(Math.random() * 10) % 2 == 0;
			split1.push( b ? civ1 : civ2);
			split2.push(!b ? civ1 : civ2);
		}
	}

	/*async send_delayed(message, msgs)
	{
		for( let i of msgs ) await message.channel.send(i);

		if(msgs.length == 0) return;
	
		var x = new VoteMessage(message.channel, msgs.shift(), true, []);
		this.send_delayed(message, msgs);
		//message.channel.send( msgs.shift() ).then( this.send_delayed(message, msgs) );
	}*/

	getCivEmojiByDBID(dbid)
	{
		for(let key in this.civs)
		{
			if(this.civs[key].dbid == dbid)
			{
				return this.getCivEmoji(key);
			}
		}
		
		//?
		return null;
	}
	
	getCiv(id)
	{
		// Be sure to capitalize first letter
		return this.civs[id[0].toUpperCase() + id.substring(1)];
	}
	getCivEmoji(id)
	{		
		const civ = this.getCiv(id);
		return '<' + civ['tag'] + civ['id'] + '>';
	}
	
	getReactionId(reaction)
	{
		return reaction.emoji.id ? reaction.emoji.id : reaction.emoji.toString();
	}
	
	async react_delayed(message, reactions)
	{
		// This is an async action which can take a iter objects, make sure we have a local copy as the objects can be changed while we await
		reactions = Array.from(reactions);
		for( let i of reactions )
		{
			// TODO: error detection here
			await message.react(i);
		}
	}
	
	/// MAP FUNCTIONS BECAUSE ES6 BUGGED ON NODE JS FOR utf8 strings
	/*mapHas(map, key)
	{
		for(const [k,value] of map)
		{
			if(k == key) return true;
		}
		return false;
	}
	mapGet(map, key)
	{
		for(const [k,value] of map)
		{
			if(k == key) return value;
		}
		return null;
	}*/
	
	getChannel(id)
	{
		for(const [key,value] of this.client.channels)
		{
			if(id == key)
			{
				return value;
			}
		}
		
		return null;
	}

	// Http(s) request util function
	makeRequest(http_or_https, options, postData, callback)
	{
		// Add default options
		//options['port'] = 443;
		if(!options.hasOwnProperty('headers')) options['headers'] = { };
		options.headers['cache-control'] = 'no-cache';
		options.headers['content-type'] = 'application/x-www-form-urlencoded';
		
		// Do request
		const req = http_or_https.request(options, res =>
		{
			res.setEncoding('utf8');

			let body = '';
			res.on('data', chunk => { body += chunk; });
			res.on('end', () => { callback(body); });
		});

		req.on('error', (e) => {
			console.error(`problem with request: ${e.message}`);
		});
		
		if(postData != null) req.write(querystring.stringify(postData));
		req.end();
	}
	
	async makeRGRequest(_path, query)
	{
		return new Promise( (resolve,reject) =>
		{
			if(query.hasOwnProperty('k')) reject('query failed - `k` is a reserved keyword');
			query['k'] = 45164513533651210762331614927827317895932951375927852974219287925;
			
			this.makeRequest(http, {
				method: 'POST',
				hostname: 'cpl.rankedgaming.com',
				path: '/api/' + _path,
			}, query, (body_rgc) =>
			{
				if(!body_rgc.startsWith('OK'))
				{
					reject(body_rgc);
				}
				else
				{
					resolve(body_rgc.length == 2 ? '' : JSON.parse(body_rgc.substr(2)));
				}
			});
		});
	}
}

module.exports = new C6Util();
