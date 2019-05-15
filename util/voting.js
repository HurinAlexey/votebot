const Events = require('events');
const rc = require('./reactioncontrol');
const util = require('./util');

var reactions = new Map();

const CustomEmojis = new Map();

class VoteManager extends Events.EventEmitter
{
	constructor()
	{
		super();

		this.globalTimeout = null;
		this.map = [];
	}

	createVote(users)
	{
		let vote = new Vote(users);
		
		if(this.globalTimeout)
		{
			vote.timeout = setTimeout(this.voteTimedOut, this.globalTimeout * 1000, this, vote);
		}
		
		this.map.push(vote);
		return vote;
	}
	
	async voteTimedOut(voteManager, vote)
	{	
		//console.log('voteTimedOut...');
		
		// delete
		voteManager.map = voteManager.map.filter(e => e != vote);
	
		// emit timeout
		voteManager.emit('timeout', vote);
	}
	
	// IMPORTANT that strings are passed along
	// usage: setCustomEmoji(':test:', '400354459668054016');
	setCustomEmoji(value, key)
	{
		CustomEmojis.set(key, '<' + value + key + '>');
	}
	
	setGlobalTimeout(seconds)
	{
		this.globalTimeout = seconds ? seconds : null;
	}

	findVote(message, user)
	{
		for( const vote of this.map )
		{
			//debug
			//if( user != util.client.user) console.log('find.hasuser:' + vote.users.includes(user) + ' find.hasmsg:' + vote.hasMessage(message) + ' msgid:' + message.id);

			if( (user == util.client.user || vote.users.includes(user)) && vote.hasMessage(message) )
			{
				return vote;
			}
		}

		return null;
	}
	
	/*findVoteChoice(message, user)
	{
		for( const vote of this.map )
		{
			if( user != util.client.user) console.log('find.hasuser:' + vote.users.includes(user) + ' find.hasmsg:' + vote.hasMessage(message) + ' msgid:' + message.id);

			if( (user == util.client.user || vote.users.includes(user)) && vote.hasMessage(message) )
			{
				return vote.getVoteChoice(message);
			}
		}

		return null;
	}*/

	async messageReactionAdd(reaction, user)
	{	
		const message = reaction.message;

		// Vote messages always sent by the bot
		if(message.author != util.client.user)
		{
			return;
		}

		if(rc.validateAdd(reaction, user))
		{
			return;
		}

		/// ABSOLUTELY CANNOT COMMENT THIS OR CIVBANS GETS BUGGED
		// absolutely needed, or crash (because it will happen before this.votePlayers is defined (!)
		/*if(user == util.client.user)
		{
			return;
		}*/
	
		const vote = this.findVote(message, user);
		if(!vote)
		{
			await rc.remove(reaction, user);
			return;
		}
		const voteChoice = vote.getVoteChoice(message);
		if(!voteChoice)
		{
			await rc.remove(reaction, user);
			return;
		}
		
		/// check if this is finalVote
		if(voteChoice == vote.voteFinal)
		{			
			// Only allow the + vote here
			if(util.getReactionId(reaction) != "➕")
			{
				await rc.remove(reaction, user);
				return;
			}
			
			///finish waiting players here
			/// find number here
			if(user != util.client.user)
			{
				let bFound = false;
				for( const [key,value] of vote.votePlayers.options )
				{
					if( value['pre'] == user )
					{
						/// ( player already voted to finish )
						if( vote.votePlayers.votes[key] )
						{
							// manually remove reaction
							await rc.remove(reaction, user);
							return;
						}
						
						
						// key == number
						//console.log("FoundKey!!! " + user.username);
						//vote.votePlayers.finishMulti( key );
						await vote.votePlayers.addVote2( user, reaction, key, 999 );
						bFound = true;
						break;
					}
				}
				
				if(!bFound)
				{
					console.log("Tragic Error here. FinalVote player not found, check if you changed datastructure. 'pre', 'post', etc...");
				}
			}
			
			// Count if all finished
			if(vote.users.length == Object.keys(vote.votePlayers.votes).length)
			{
				vote.finished = true;
				
				if(this.timeout)
				{
					clearTimeout(this.timeout);
				}
				
				// votePlayers and voteFinal are now ONE message (!)
				//vote.votePlayers.message.delete();
				// Remove from map
				vote.messages = vote.messages.filter( e => e != vote.voteFinal );
				await vote.voteFinal.message.delete();
				
				this.emit('finished', vote, message.channel);
			}
			
			return;
		}
		//check if player already finished voting, if he did, block his action here
		else if( vote.playerFinishedVoting(user) )
		{
			await rc.remove(reaction, user);
			return;
		}

		await voteChoice.addVote(user, reaction);
	}

	messageReactionRemove(reaction, user)
	{
		const message = reaction.message;

		// Vote messages always sent by the bot
		if(message.author != util.client.user)
		{
			return;
		}

		if(rc.validateRemove(reaction, user))
		{
			return;
		}
		
		/*if(user == util.client.user)
		{
			return;
		}*/
	
		const vote = this.findVote(message, user);
		if(!vote)
		{
			rc.remove(reaction, user);
			return;
		}
		const voteChoice = vote.getVoteChoice(message);
		if(!voteChoice)
		{
			rc.remove(reaction, user);
			return;
		}
		
		/// check if this is finalVote
		if(voteChoice == vote.voteFinal)
		{
			//cannot undo it (!)
			return;
		}
		//check if player already finished voting, if he did, block his action here
		else if( vote.playerFinishedVoting(user) )
		{
			// send error?
			return;
		}
		
		/// FIX LATER: sometimes bot crashes here because this.votes[reaction] does not exist (!)
		voteChoice.removeVote(user, reaction);
	}
}

//logic for single only
class VoteChoice
{
	constructor(display, options, totalVotes, tieBreaker, separator, connector, bIsMulti)
	{
		this.display = display;
		this.options = options;
		this.separator = separator;
		this.connector = connector;
		this.totalVotes = totalVotes;
		this.tieBreaker = tieBreaker;
		this.multi = bIsMulti;
		this.voted = [];
		this.votes = [];
		this.votecount = new Map();
		this.stalemate = Math.floor( this.totalVotes / 2 );
		
		this.votesBot = new Map();
		
		this.chosen = null; //singlevote only
		
		this.finished = this.multi ? new Map() : false;		
		for(const [key,value] of options)
		{
			this.setOption(key, value);
		}
	}

	async addVote(user, reaction, voteStrength = 0)
	{
		const choice = util.getReactionId(reaction);
		await this.addVote2(user, reaction, choice, voteStrength);
	}
	
	/// voteStrength is a custom hack to make finished players into one message
	async addVote2(user, reaction, choice, voteStrength)
	{
		//console.log("attempt addVote");		
		
		// BotVote (!)
		if(user == util.client.user)
		{
			this.votesBot.set(choice, reaction);
			return;
		}
		
		if(!this.options.has(choice))
		{
			await rc.remove(reaction, user); // invalid option - happens if someone manually reacts with an emoji
			return;
		}
		
		// check if vote already finished. remove reaction
		if(this.multi && this.finished[choice])
		{
			await rc.remove( reaction, user );
			return;
		}
		else if(!this.multi && this.finished)
		{
			await rc.remove( reaction, user );
			return;
		}
		//

		/// Single Vote Police
		if(!this.multi && this.voted[user])
		{
			// remove existing vote
			let temp_reaction = this.voted[user];
			this.removeVote(user, temp_reaction);
		
			// discord remove
			await rc.remove( temp_reaction, user);
		}
		///

		//// FIX LATER. the mapused for multi could also be used in single (!)
		if(this.multi)
		{
			if(!this.voted[user]) this.voted[user] = new Map();
			this.voted[user].set(choice, reaction );
		}
		else
		{
			this.voted[user] = reaction;
		}

		//if( !this.votes[choice] ) this.votes[choice] = [];
		if( !(choice in this.votes) ) this.votes[choice] = [];
		this.votes[choice].push(user);

		if( !this.votecount.has(choice)) this.votecount.set(choice, 0);
		this.votecount.set(choice, this.votecount.get(choice) + voteStrength + (user == this.tieBreaker ? 1.5 : 1));

		//console.log('possfin: ' + this.votecount.get(choice) + ' vs ' + this.stalemate);
		if( this.votecount.get(choice) > this.stalemate )
		{
			if(this.multi)
			{
				await this.finishMulti(choice);
			}
			else
			{
				await this.finishSingle(choice);
			}
		}
	}

	removeVote(user, reaction)
	{
		const choice = util.getReactionId(reaction);
		
		//if( !this.votes.includes(choice) )
		if( !(choice in this.votes) )
		{
			/// This potentially happens if someone adds an invalid emoji and then removes it before the bot can police it
			/// Not returning here would result in a crash
			return;
		}

		/// May have already been internally removed
		if( this.votes[choice].includes(user) )
		{
			if(this.multi)
			{
				this.voted[user].delete(choice);
			}
			else
			{
				delete this.voted[user];
			}
			delete this.votes[choice][user];
			this.votecount.set(choice, this.votecount.get(choice) - (user == this.tieBreaker ? 1.5 : 1));
		}
	}
	
	setOption(key, value)
	{
		this.options.set(key, value);
		if(this.multi) this.finished.set(key, false);
	}

	/*async finish(choice)
	{
		/// never determines a vote anywjhere
		if(multi) finishMulti(choice);
		else finishSingle(choice);
	}*/
	
	async finishSingle(choice)
	{
		this.finished = true;
		this.chosen = choice;
		this.message.clearReactions().then( () =>
		{
			this.refresh();
		});
	}
	async finishMulti(choice)
	{
		this.finished.set(choice, true);
		
		// Remove reactions from all users that voted on this (!)
		for(const user of this.votes[choice])
		{
			const reaction = this.voted[user].get(choice);
			await rc.remove( reaction, user );
		}
		
		// Remove Bot Reaction ( which is not guaranteed to be present, due to custom options)
		if(this.votesBot.has(choice))
		{
			await rc.remove( this.votesBot.get(choice), util.client.user);
		}
					
		//console.log("finmap:" + this.finished.size + this.finished);
		
		this.refresh();
	}
	async refresh()
	{
		const msg = await this.getRefreshMessage();
		await this.message.edit( msg );
	}
	async getRefreshMessage()
	{
		if(!this.multi)
		{
			return this.getRefreshMessage2(this.finished ? new Map([[this.chosen, this.options.get(this.chosen)]]) : this.options);
		}
		else
		{
			let result = new Map();
			for(const [key,value] of this.finished)
			{
				const r = this.options.get(key);
				if(typeof(r) == 'string')
				{
					//old:if(value == this.showOnVoted)
					if(!value)
					{
						result.set(key, r);
					}
				}
				else if(typeof(r) == 'undefined')
				{
					
				}
				else
				{
					if(!value && typeof(r['pre']) != 'undefined' && r['pre'] != '')
					{
						result.set(key, r['pre']);
					}
					// Process 'post' at the same time to keep order of display
					else if(value && typeof(r['post']) != 'undefined' && r['post'] != '')
					{
						result.set(key, r['post']);
					}
				}
			}
			
			// Process 'post' later in a second loop so that the first line can contain unvoted items and aftewards come the voted ones
			/*for(const [key,value] of this.finished)
			{
				const r = this.options.get(key);
				console.log('[keycheck] ' + key + ' [typeof_r] ' + typeof(r) + ' [typeof_post] ' + typeof(r['post']) + ' [post] ' + r['post']);
				if(typeof(value) != 'string')
				{
					if(value && typeof(r['post']) != 'undefined' && r['post'] != '')
					{
						result.set(key, r['post']);
					}
				}
			}*/
			
			return this.getRefreshMessage2(result);
		}
	}
	getRefreshMessage2(options)
	{
		return Vote.createMessage(this.display, options, this.separator, this.connector);
	}
	
	getResults()
	{
		let results = [];
		if(this.multi)
		{
			for( const [key,value] of this.finished)
			{
				if(value == true)
				{
					results.push(key);
				}
			}
		}
		else if(this.chosen)
		{
			results.push(this.chosen);
		}
		return results;
	}
}

class Vote
{
	constructor(users)
	{
		this.finished = false;
		this.timeout = null;

		// the only allowed voters
		this.messages = [];
		this.users = users ? users : [];
		this.tieBreaker = users.length == 0 ? null : users[0];
		this.voteChoices = new Map();
		this.voteCivBans = null;//remove this maybe?
	}

	async show(channel, display)
	{
		channel.send(display).then( message => { this.messages.push(message); }); 
	}
	
	async showChoice(channel, display, options = new Map(), { separator  = ' | ', connector = ' = ', multi = false, callback = null })
	{
		const vote = new VoteChoice(display, options, this.users.length, this.tieBreaker, separator, connector, multi);
		const msg = await vote.getRefreshMessage();
		const message = await channel.send(msg);

		vote.message = message;
		this.messages.push(message);
		this.voteChoices.set(message.id, vote);
		
		/// TODO: add noreact:true key for reacts
		await util.react_delayed(message, options.keys());
		if(callback) callback(vote);
	}

	static createMessage(display, options, separator, connector)
	{
		if(options.size == 0)
		{
			// empty options
			return display;
		}

		let msg = display;
		for(const [key,value] of options)
		{
			msg += (CustomEmojis.has(key) ? CustomEmojis.get(key) : key) + connector + value + separator;
		}
		return separator.length == 0 ? msg : msg.slice(0, -separator.length); // remove pending ' | '
	}

	hasMessage(message) { return this.voteChoices.has(message.id); }
	getVoteChoice(message) { return this.voteChoices.get(message.id); }

	/*async finish()
	{
		console.log('finish....');
		for( const [key, value] of this.voteChoices ) await value.finish();
		this.voteChoices.clear();
	}*/
	
	playerFinishedVoting(user)
	{
		// The votePlayers message may not have been generated yet
		if( !this.votePlayers ) return;
		
		for( const [key,value] of this.votePlayers.options )
		{
			if( value['pre'] == user )
			{
				/// ( player already voted to finish )
				if( this.votePlayers.votes[key] )
				{
					return true;
				}					
			}
		}
		
		return false;
	}

	async showFinal(channel, display)
	{
		/// shows all usernames
		/// its a normal showChoice, single. Hackily set staleMate = this.users.length, options to plus symbol, then setOption for each player (!) and then hackily when someone votes have them be a finished vote?!
		/*this.showChoiceMulti(channel, display, new Map(), '\n', ' ', false, (vote) =>
		{
			// Hax
			vote.stalemate = 0;
		
			// Generate a symbol for each user
			{
				const numbers = [ '0⃣ ', '1⃣ ', '2⃣ ', '3⃣ ', '4⃣ ', '5⃣ ', '6⃣ ', '7⃣ ', '8⃣ ', '9⃣ ', '🔟', '🇦', '🇧', '🇨', '🇩', '🇪', '🇫' ];
				let counter = 0;
				for(let i of this.users) vote.setOption(numbers[counter++], i);
			}
			
			// Refresh Display
			vote.refresh();

			//this.waitingPlayers = vote;
			this.votePlayers = vote;
		});
		
		this.showChoiceSingle(channel, "**__Vote Finished__**\n", new Map([["➕", ""]]), '', '', true, (vote) =>
		{
			// Hax
			vote.stalemate = this.users.length;
			this.voteFinal = vote;
		});*/
		
		this.showChoice(channel, display, new Map([["➕", ""]]), { separator: '\n', connector: ' ', multi: true, callback: async(vote) =>
		{
			// Generate a symbol for each user
			{
				const numbers = [ '0⃣ ', '1⃣ ', '2⃣ ', '3⃣ ', '4⃣ ', '5⃣ ', '6⃣ ', '7⃣ ', '8⃣ ', '9⃣ ', '🔟', '🇦', '🇧', '🇨', '🇩', '🇪', '🇫' ];
				let counter = 0;
				for(let i of this.users) vote.setOption(numbers[counter++], { pre: i });
			}

			// Hacked Vars to make this work
			vote.stalemate = this.users.length; //??? maybe hsould be one ????
			vote.finished.set("➕", true);

			// Keep votePlayers so we keep code backwards compatible
			this.voteFinal = vote;
			this.votePlayers = vote;
			
			// Refresh Display
			await vote.refresh();
		}});
	}
	
	// finished: edit choices to display the winning choice only, clear all reactions
}

module.exports = new VoteManager();
