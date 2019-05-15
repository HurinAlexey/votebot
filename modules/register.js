const util = require('../util/util');
const errorHandler = require('../util/errormessage');

const Discord = require('discord.js');

const cmd_register = '.register';
const cmd_forceregister = '.forceregister';

function GetChannelProfileProof() { return util.getChannel(342377106971295744); }
function GetChannelWelcome() { return util.getChannel(368928122219003904); }
const moderatorId = '291753249361625089';
const gamereporterId = '368927954463621132';
const ranked = '401892311975591946';
const chieftain = '542774298180452377';

const http = require('http');
const https = require('https');

// Create an HTTP server
const srv = http.createServer( (req, res) =>
{
	res.writeHead(200, { 'Content-Type': 'text/html' });
	res.write('<img src="http://civplayers.com/images/logos/c4p_logo_d.jpg"/><br><br>');
	//res.end('okay');
	
	const API_ENDPOINT = '/api/v7'
	const CLIENT_ID = '482621155136765973'
	const CLIENT_SECRET = 'JChcdmGMNKx0DwQMXx1WMlahlAGNORQm'
	const REDIRECT_URI = 'http://34.216.163.75'

	const params = getParams(req);
	if(params.hasOwnProperty('code'))
	{
		if(!params.hasOwnProperty('state'))
		{
			res.end('<b>Error</b><br>Please request a new link from Discord by using .register - this link does not contain your Discord UserID');
			return;
		}
		
		const state = JSON.parse(decodeURIComponent(params.state));

		const channel = util.getChannel(state.chan); if(channel == null) 
		{
			res.end('<b>Error</b><br>Failed to access the Discord channel. Please report this error to a member of staff!');
			return;
		}
		
		///
		/// Initial OAuth2 Request
		///
		util.makeRequest(https, {
			method: 'POST',
			hostname: 'discordapp.com',
			path: API_ENDPOINT + '/oauth2/token',
		}, {
			client_id: CLIENT_ID,
			client_secret: CLIENT_SECRET,
			grant_type: 'authorization_code',
			code: params.code,
			redirect_uri: REDIRECT_URI,
			scope: 'identify connections'
		}, (body) =>
		{
			const json = JSON.parse(body);
			
			///
			/// Fetch Discord UserID
			///
			util.makeRequest(https, {
				method: 'GET',
				hostname: 'discordapp.com',
				path: API_ENDPOINT + '/users/@me',
				headers: { 'authorization': 'Bearer ' + json.access_token },
			}, null, (body_me) =>
			{
				const json_me = JSON.parse(body_me);
				if(json_me.hasOwnProperty('code'))
				{
					res.end('<b>Error</b><br>' + json_me.message);
					return;
				}
				
				if(state.user != json_me.id)
				{
					res.end('<b>Error</b><br>You are logged into two different Discord accounts - one on the website and one in your app. Log out of the website and try again.');
					return;
				}
				
				///
				/// Fetch Discord User/Connections
				///
				util.makeRequest(https, {
					method: 'GET',
					hostname: 'discordapp.com',
					path: API_ENDPOINT + '/users/@me/connections',
					headers: { 'authorization': 'Bearer ' + json.access_token },
				}, null, async(body_connections) =>
				{				
					const json_connections = JSON.parse(body_connections);
					//console.log('[discord_connections] ' + body_connections);
					if(json_connections.hasOwnProperty('code'))
					{
						res.end('<b>Error</b><br>' + json_connections.message);
						return;
					}

					let _steamid = null;
					for(const c of json_connections)
					{
						if(c.type == 'steam')
						{
							_steamid = c.id;
							break;
						}
					}
					
					/*if(_steamid == null)
					{
						res.write('<b>Debug</b><br>' + body_connections + '<br><br>');
						res.write('<b>Token</b><br>' + json.access_token + '<br><br>');
						res.end('<b>Error</b><br>Failed to retreive your linked Steam Account: Please follow this link and confirm your linked Steam Account: <a href="https://cpl.rankedgaming.com/link_steam.php?id=' + json_me.id + '">https://cpl.rankedgaming.com/link_steam.php?id=' + json_me.id + '</a>');
						return;
					}*/
					
					const user = util.client.users.get(json_me.id);
					const member = GetChannelProfileProof().guild.member(user);
					if(member == null)
					{
						res.end('<b>Error</b><br>Your cached discord user was not found! Please report this problem to our staff.');
						return;
					}
					
					try
					{
						let response = await util.makeRGRequest('register.php', {
							discordid: json_me.id,
							steamid: _steamid,
							name: json_me.username
						});
						
						// Finish up HTTP reply
						res.write('<b>Success</b><br>You may close this window and return to Discord');

                        //glicko start
                        //const mc = new MongoConnection("testDB", "test");
                        //mc.createPlayer(discordid, steamid);
                        //mc.disconnect();
                        //glicko end

						// Notify User Channel
						GetChannelWelcome().send('<@' + json_me.id + '>, you have been registered successfully.\nPlease read <#550251325724557322> and <#553224175398158346>.');
						
						// Notify Admin Channel
						await GetChannelProfileProof().send('<@' + json_me.id + '> <https://steamcommunity.com/profiles/' + _steamid + '>');
						
						// Add Ranked Role
						await member.addRoles([ranked, chieftain]);
					}
					catch( err )
					{
						res.write('<b>Debug</b>' + body_connections);
						res.write('<b>Error</b><br>' + err);
					}
					
					res.end();
				});
			});
		});
	}
	/*else
	{
		console.log(params);
		console.log(req.headers);
	}*/
});

function getParams(req)
{
	let q = req.url.split('?'), result={};
	if(q.length >= 2)
	{
		q[1].split('&').forEach((item)=>
		{
			const index = item.indexOf('=');
			if(index == -1) result[item] = '';
			else result[item.substr(0, index)] = item.substr(index+1);
		});
	}
	return result;
}

class RegisterModule
{
	constructor()
	{
		util.client.on('message', message => { this.handle(message); });
		util.client.on('ready', () => { srv.listen(80, () => { console.log('http listening'); }); });
	}
	
	testRequest(fail)
	{
		return new Promise( (resolve,reject) =>
		{
			if(fail) reject('failed');
			else resolve('success');
		});
	}
	
	async handle(message)
	{
		const content = message.content;
		if(message.author.bot == true) return; // ignore bot messages, so its own messages really - otherwise we end up in an infinite spam loop of errors
		
		/*var error = errorHandler.create();
		importer.importAll(message, error).then( () =>
		{
			error.send(message.channel, 30);
		});
		return;*/
		
		/*if(content == '.test')
		{
			console.log('[guest] ' + message.guild.roles.find('name', 'Guest').id);
			console.log('[member] ' + message.guild.roles.find('name', 'Member').id);
			console.log('[ranked] ' + message.guild.roles.find('name', 'Ranked').id);
		}*/
		
		if( content.startsWith(cmd_register) )
		{
			const target = message.author;
			//const target = message.mentions.users.size == 0 ? message.author : message.mentions.users.value().next();
			
			let error = errorHandler.create();
			try
			{
				let registered = await util.makeRGRequest('toimport.php', {[target.id]: ''});
				if(registered.length == 0)
				{
					message.channel.send(target + ' is already registered.');
				}
				else
				{
					//error.add('[**Important**] If you are an existing CPL player and your stats are not yet in the new stats system. Please do **not** use **' + cmd_register + '** just wait for one of your games to be reported. Otherwise your myleague stats will not be imported.');
					const state_string = JSON.stringify({ user: target.id, chan: message.channel.id });
					message.reply('please click on the following link, then authorize the bot:\n<https://discordapp.com/oauth2/authorize?response_type=code&client_id=482621155136765973&scope=identify%20connections&redirect_uri=http%3A%2F%2F34.216.163.75&state=' + state_string + ">").then(msg => { msg.delete(20000) });
				}
			}
			catch(err)
			{
                console.log(err);
				message.channel.send(err);
			}
			
			//error.send(message.channel, 60);
			
			/*util.makeRGRequest('toimport.php', {[target.id]: ''})
			.then( body_rgc =>
			{
				if(body_rgc == 'OK')
				{
					error.add(target + ' is already registered.');
				}
				else
				{
					}
				
				error.send(message.channel, 60);
			})
			.catch( body_rgc => {
				error.add(body_rgc);
				error.send(message.channel, 60);
			});*/
			
			return;
		}
		else if( content.startsWith(cmd_forceregister) &&
                (message.member.roles.has(moderatorId) || message.member.roles.has(gamereporterId)) )
                {
                        if(message.mentions.members.size == 0)
                        {
                                message.channel.send('**Error:**' + cmd_forceregister + ' requires that one user be tagged');
                                return;
                        }
			            else if ( message.mentions.members.size > 1 )
                        {
                                message.channel.send('**Error:**' + cmd_forceregister + ' can only use one @DiscordName at a time');
                                return;
                        }

                        const target = message.mentions.members.values().next().value;

                        let error = errorHandler.create();
                        try
                        {
                            const steamid = message.content.split(' ').pop().split('https://steamcommunity.com/profiles/').pop();
                            await util.makeRGRequest('register.php', {
                                discordid: target.id,
                                steamid: steamid,
                                name: target.displayName,
                                rating: 1500,
                                wins: 0,
                                losses: 0
                            });

						    await GetChannelProfileProof().send('<@' + target.id + '> <https://steamcommunity.com/profiles/' + steamid + '>');
						    // Add Ranked and Chieftain Roles
						    await target.addRoles([ranked, chieftain]);
                            message.channel.send(target + ' has now been registered with default stats and given the ranked role.');
                        }
                        catch (err)
                        {
                            console.log(err);
                            message.channel.send("**Error**\n" + err);
                        }
                        //catch(err) { error.add(err); }

                        //error.send(message.channel, 30);
                        await message.delete();
                        return;
                }
		/// DEVELOPER ONLY
		/*if( content.startsWith('.unregister') )
		{
			const target = message.author;
			if(statsDB.contains(target.id))
			{
				statsDB.del(target.id);
				let error = errorHandler.create();
				error.add('Stats for ' + target + ' purged.');
				error.send(message.channel, 30);
			}
		}*/
	}
}

module.exports = new RegisterModule();
