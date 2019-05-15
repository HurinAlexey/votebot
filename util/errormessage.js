class ErrorMessage
{
	constructor(user)
	{
		this.errs = [];
		this.user = typeof user !== 'undefined' ? user + ' ' : '';
		this.isError = true;
	}
	
	construct()
	{
		if(this.errs.length == 0) return null;
		else if(this.errs.length == 1)
		{
			return this.user + (this.isError ? '**Error detected:**' : '') + '\n' + this.errs[0];
		}
		
		var result = this.user + (this.isError ? '**Multiple errors detected:**' : '');
		for(var i = 0; i < this.errs.length; ++i) result += '\n**' + (i+1) + ')** ' + this.errs[i];
		return result;
	}
	
	add(msg)
	{
		this.errs.push(msg);
	}
	
	send(channel, timeoutSeconds)
	{	
		return new Promise( (resolve) =>
		{
			if(this.errs.length == 0) resolve(false);
			
			channel.send(this.construct()).then( message => {
				if(timeoutSeconds != 0)
				{
					setTimeout(this.timedOut, timeoutSeconds * 1000, message);
				}
				
				resolve(true);
			});
		});
	}
	
	async timedOut(message)
	{
		// check if the message is still present
		const message_check = await message.channel.fetchMessage(message.id);
		if(message_check != null) await message.delete();
	}
}

class ErrorMessagerHandler
{
	create(user)
	{
		return new ErrorMessage(user);
	}
}

module.exports = new ErrorMessagerHandler();
