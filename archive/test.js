const util = require('./util/util');
const file_messages = 'data/messages.txt';

util.client.on('message', message =>
{
	const content = message.content;
	
	/// info
	if( content == '.test')
	{
		if(!message.guild.available)
		{
			console.log('fatal err - guild not available');
		}
		else
		{
			message.channel.send('Members: ' + message.guild.memberCount);
		}
	}
	else if( content == '.test2' )
	{
		savedMessages.fetchEarlier(message);
		savedMessages.fetchLater(message);
	}
	else if( content == '.test3' )
	{
		message.channel.fetchMessages({ limit: 1, after: 399516053450915840 })
		.then(messages => {
			console.log('[test3]' + messages.values().next().value.content);
		})
		.catch(console.error);
	}
	
	// 123
	new ParseMessage(message);
});

class ParseMessage
{
	constructor(message) // sm of SavedMessage
	{
		//sm.snowflake,author,content,mentions...
		console.log('[mentions]' + message.mentions.members.size + '[msg]' + message.content);
		const lines = message.content.split('\n');
		console.log('[lines]' + lines.length);
		
		for(const line in lines)
		{
			console.log('[line]' + line);
			//const matches = line.match(/<@!?(1|\d{17,19})>/g); //line.match(message.mentions.USERS_PATTERN);
			const regxp = /<@(\d+)>/g;
			const matches = regxp.exec(line);
			//const matches = line.match(); //line.match(message.mentions.USERS_PATTERN);
			console.log('[match]' + matches);
		}
	}
}

class SavedMessage
{
	constructor(snowflake, author, content)
	{
		this.snowflake = snowflake;
		this.author = author;
		this.content = content;
	}
}

class SavedMessages
{
	constructor()
	{
		this.map = new Map();
		this.earliest = null;
		this.latest = null;

		util.fs.access(file_messages, (err) => 
		{
			if(!err)
			{
				util.fs.readFile(file_messages, (err, data) =>
				{
					if (err) throw err;
			
					data = data.toString().split('\r\n');

					const size = Math.floor(data.length / 3);
					for(let i = 0; i < size; ++i)
					{
						this.setData(data[3*i], data[3*i+1], data[3*i+2]);
					}
					
					console.log('[size]' + size + '[earliest]' + this.earliest + '[latest]' + this.latest);
				});
			}
		});
	}
	
	setData(snowflake, authorId, content)
	{
		if(this.earliest == null || this.earliest > snowflake) this.earliest = snowflake;
		if(this.latest == null || this.latest < snowflake) this.latest = snowflake;
		
		this.map.set(snowflake, new SavedMessage(snowflake, authorId, content));
	}
	
	fetchEarlier(message)
	{
		const _self = this;
		
		if(this.earliest == null)
		{
			message.channel.fetchMessages({ limit: 100 })
			.then(messages => { if(_self.fetchedMessages(_self, messages) != 0) _self.fetchEarlier(message) })
			.catch(console.error);
		}
		else
		{
			message.channel.fetchMessages({ limit: 100, before: this.earliest })
			.then(messages => { if(_self.fetchedMessages(_self, messages) != 0) _self.fetchEarlier(message) })
			.catch(console.error);
		}
	}
	
	fetchLater(message)
	{
		const _self = this;
		
		if(this.latest == null)
		{
			message.channel.fetchMessages({ limit: 100 })
			.then(messages => { if(_self.fetchedMessages(_self, messages) != 0) _self.fetchLater(message) })
			.catch(console.error);
		}
		else
		{
			message.channel.fetchMessages({ limit: 100, after: this.latest })
			.then(messages => { if(_self.fetchedMessages(_self, messages) != 0) _self.fetchLater(message) })
			.catch(console.error);
		}
	}

	fetchedMessages(_self, messages)
	{
		console.log(`Received ${messages.size} messages`);
		for(const [key,value] of messages)
		{
			//if(messages.size == 1) console.log('[latest]' + _self.latest + '[key]' + key + '[msg]');
			_self.setData(key, value.author.id, value.content);
		}
		_self.save();
		
		return messages.size;
	}
	
	
	/*set(key, value)
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
	}*/

	save()
	{
		const stream = util.fs.createWriteStream(file_messages);
		stream.once('open', (fd) =>
		{
			this.map.forEach( (value, key) => { stream.write(value.snowflake + '\r\n' + value.author + '\r\n' + value.content + '\r\n'); });
			stream.end();
		});
	}
}
const savedMessages = new SavedMessages();

util.login_token('test');
