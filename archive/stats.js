const util = require('./util/util');

const cmd_stats = '.stats';
const cmd_statsRF = '.statsrf';
const cmd_ratings = '.ratings';
const cmd_ratingsRF = '.ratingsrf';
const cmd_stats_set = '.stats-link';
const cmd_separator = ' ';

const file_myleague = 'data/myleague.txt';

const error_formatting = "Formatting error! Either use **.stats** for your own stats or **.stats @discordUser** to check someone else's stats";

function GetChannelBotCommands() { return util.getChannel(304782408526594049); }

util.client.on('message', message =>
{
	const content = message.content.toLowerCase();
	if ( message.channel != GetChannelBotCommands() )
	{
		return;
	}
	if( content == cmd_stats || content == cmd_statsRF )
	{
		// usage on 'self'
		var target = message.member;
	}
	/*else if( content.startsWith( ".me" ) )
	{
		// message.member.roles or message.member.permissions
		// .permissions.has ( ADMINISTRATOR  )
		// ADMINISTRATOR
		var target = message.mentions.members.array().shift();
		if(target.id == 131239815076118528)
		{
			console.log('roger');
		}
		if(target.permissions.has( ADMINISTRATOR ) )
		{
			console.log('admin');
		}
		return;
	}*/
	else if( content.startsWith(cmd_stats_set) )
	{
		if(message.mentions.members.size != 0)
		{
			message.channel.send('Error **' + cmd_stats_set + '** has to be used with your **__MyLeague__** name, not your @DiscordName');
			return;
		}
		
		// content is now the myleague username
		const new_name = content.substring( cmd_stats_set.length + cmd_separator.length );

		// add to exceptions
		names.set( message.member.id, new_name );

		message.channel.send('Your myleague name has now been set to: **' + new_name + '**');
		return;
	}
	else if( content.startsWith(cmd_ratings) || content.startsWith(cmd_ratingsRF) )
	{
		if(message.mentions.members.size == 0)
		{
			message.channel.send('The **' + cmd_ratings + '** command needs to be used with atleast one player');
			return;
		}

		const total_size = message.mentions.members.size;
		let total_counter = 0;
		let total_arr = [], ratings = [];
		
		if(content.startsWith(cmd_ratingsRF))
		{
			/// Duplicate Code
			message.mentions.members.forEach( (value, key) =>
			{
				fetchStats( value, message, 'http://www.myleague.com/civplayersc6rf/profile/', (err, mmmmmm, username, fetcher) =>
				{
					if(err) message.channel.send(getFetchError(username));
					else
					{
						ratings[username] = fetcher.rating;
						
						let i = 0; for(; i < total_arr.length; ++i)
						{
							// Insert if the player has higher rating than someone else
							if(ratings[total_arr[i]] < fetcher.rating)
							{
								//total_arr.splice(i, 0, ['user' => username, 'rating' => fetcher.rating]);
								total_arr.splice(i, 0, username);
								break;
							}
						}
						
						// Add at the bottom
						if(i == total_arr.length)
						{
							total_arr.push(username);
						}
					}

					if(++total_counter == total_size)
					{
						let msg = '**__Ratings__**\n';
						for(let i = 0; i < total_arr.length; ++i) msg += total_arr[i] + ' [**' + ratings[total_arr[i]] + '**]\n';
						message.channel.send(msg);
					}
				});
			});
		}
		else
		{
			/// Duplicate Code
			message.mentions.members.forEach( (value, key) =>
			{
				fetchStats( value, message, 'http://www.myleague.com/civ6players/profile/', (err, mmmmmm, username, fetcher) =>
				{
					if(err) message.channel.send(getFetchError(username));
					else
					{
						ratings[username] = fetcher.rating;
						
						let i = 0; for(; i < total_arr.length; ++i)
						{
							// Insert if the player has higher rating than someone else
							if(ratings[total_arr[i]] < fetcher.rating)
							{
								//total_arr.splice(i, 0, ['user' => username, 'rating' => fetcher.rating]);
								total_arr.splice(i, 0, username);
								break;
							}
						}
						
						// Add at the bottom
						if(i == total_arr.length)
						{
							total_arr.push(username);
						}
					}

					if(++total_counter == total_size)
					{
						let msg = '**__Ratings__**\n';
						for(let i = 0; i < total_arr.length; ++i) msg += total_arr[i] + ' [**' + ratings[total_arr[i]] + '**]\n';
						message.channel.send(msg);
					}
				});
			});
		}
		
		return;
	}
	else if( !content.startsWith(cmd_stats + cmd_separator) && !content.startsWith(cmd_statsRF + cmd_separator) )
	{
		if( content.startsWith(cmd_stats) || content.startsWith(cmd_statsRF) )
		{
			message.channel.send(error_formatting);
		}
		
		return;
	}
	else
	{
		if(message.mentions.members.size == 0)
		{
			message.channel.send('The **' + cmd_stats + '** command needs to be used with atleast one player');
			return;
		}
		
		var target = message.mentions.members.array().shift();
	}
	
	if( !target )
	{
		console.log("CRASH_ERROR [content] " + content + " [mentions.members.size] " + message.mentions.members.size);
		return;
	}

	// Execute Fetch
	/*if(content.startsWith(cmd_stats))
	{
		fetchStats(target, (err, username, fetcher) =>
		{
			if(err)
			{
				message.channel.send(getFetchError(username));
			}
			else
			{
				message.channel.send(
					//'**__Name__**\n' + username + '\n\n' +
					username + '\n\n' +
					'**__Stats__**\nLadder: **' + fetcher.rank + '**\nRating: **' + fetcher.rating + '**\nWinrate: **' + fetcher.winrate + '%**\n\n' +
					'**__Games History__**\nWeek: **' + fetcher.week + '**\nMonth: **' + fetcher.month + '**\nLifetime: **' + fetcher.lifetime + '**'
				);
			}
		});
	}
	else if(content.startsWith(cmd_statsRF))
	{
		fetchStats(target, (err, username, fetcher) =>
		{
			if(err)
			{
				message.channel.send(getFetchError(username));
			}
			else
			{
				message.channel.send(
					//'**__Name__**\n' + username + '\n\n' +
					username + '\n\n' +
					'**__Stats__**\nLadder: **' + fetcher.rank + '**\nRating: **' + fetcher.rating + '**\nWinrate: **' + fetcher.winrate + '%**\n\n' +
					'**__Games History__**\nWeek: **' + fetcher.week + '**\nMonth: **' + fetcher.month + '**\nLifetime: **' + fetcher.lifetime + '**'
				);
			}
		});
	}*/
	
	if(content.startsWith(cmd_statsRF))
	{
		fetchStatsRF(target, message, statsResults);
	}
	else if(content.startsWith(cmd_stats))
	{
		fetchStatsVanilla(target, message, statsResults);
	}
});

function statsResults(err, message, username, fetcher)
{
	if(err)
	{
		message.channel.send(getFetchError(username));
	}
	else
	{
		message.channel.send(
			//'**__Name__**\n' + username + '\n\n' +
			username + '\n\n' +
			'**__Stats__**\nLadder: **' + fetcher.rank + '**\nRating: **' + fetcher.rating + '**\nWinrate: **' + fetcher.winrate + '%**\n\n' +
			'**__Games History__**\nWeek: **' + fetcher.week + '**\nMonth: **' + fetcher.month + '**\nLifetime: **' + fetcher.lifetime + '**'
		);
	}
}

function getFetchError(user) 
{
	return 'Error fetching stats for: ' + user + ' :: The player in question needs to use **' + cmd_stats_set + cmd_separator + ' myleaguename**';
}

function fetchStatsVanilla(user, message, callback)
{
	fetchStats(user, message, 'http://www.myleague.com/civ6players/profile/', callback);
}

function fetchStatsRF(user, message, callback)
{
	fetchStats(user, message, 'http://www.myleague.com/civplayersc6rf/profile/', callback);
}

function fetchStats(user, message, url, callback)
{
	// Handle Name Exceptions
	let myleaguename = user.displayName;
	let usernameused = user;
	if(names.contains(user.id))
	{
		myleaguename = names.get(user.id);
		usernameused += ' (*' + myleaguename + '*)';
	}

	//console.log('fetch: ' + myleaguename + ' user: ' + user);
	var http = require('http');
	http.get(url + myleaguename, res =>
	{
		res.setEncoding("utf8");
		let body = '';
		res.on('data', data => { body += data; });
		res.on('end', () =>
		{
			if( body.includes('Oops, we have encountered an error with this page!') )
			{
				console.log('user2: ' + user);
				callback(true, message, usernameused);
			}
			else
			{
				const fetcher = new MyleagueData(body);
				callback(false, message, usernameused, fetcher);
			}
		});
	});
}

class MyleagueData
{
	// .lifetime, .month, .rank, .rating, .week, .winrate
	constructor(data)
	{
		this.body = data;
		this.index = this.body.indexOf('<tr class="sub_summary">');
		
		const data_rank = 'fff">';
		this.rank = this.body.substring(this.body.indexOf(data_rank, this.index) + data_rank.length, this.body.indexOf('</td>', this.index));
		this.index = this.body.indexOf('<tr>', this.index);

		if(this.rank.length == 0) this.rank = 'N/A';

		// lifetime, week, month, rating, win%
		this.lifetime = this.fetchNext();
		this.week = this.fetchNext();
		this.month = this.fetchNext();
		this.rating = this.fetchNext();
		this.winrate = this.fetchNext();
	}

	fetchNext()
	{
		const data_start = '<td align="center">';
		const data_end = '</td>';
	
		this.index = this.body.indexOf(data_start, this.index) + data_start.length;
		return this.body.substring(this.index, this.body.indexOf(data_end, this.index)).replace(/\ |\t|\r|\n/g, "");
	}
}

class NameExceptions
{
	constructor()
	{
		this.map = new Map();

		util.fs.access(file_myleague, (err) => 
		{
			if(!err)
			{
				util.fs.readFile(file_myleague, (err, data) =>
				{
					if (err) throw err;
			
					data = data.toString().split('\r\n');

					const size = Math.floor(data.length / 2);
					for(let i = 0; i < size; ++i)
					{
						this.map.set(data[2*i],  data[2*i+1]);
					}
				});
			}
		});
	}

	set(key, value)
	{
		this.map.set(key, value);
		this.save();
	}

	contains(key)
	{
		return this.map.has(key);
	}
	
	get(key)
	{
		return this.map.get(key);
	}

	save()
	{
		const stream = util.fs.createWriteStream(file_myleague);
		stream.once('open', (fd) =>
		{
			this.map.forEach( (value, key) => { stream.write(key + '\r\n' + value + '\r\n'); });
			stream.end();
		});
	}
}
const names = new NameExceptions();

util.login_token('stats');
