class ReactionControl
{
	constructor()
	{
		this.vAdd = new Map();
		this.vRem = new Map();
	}
	
	validateAdd(reaction, user)
	{
		if(!this.vAdd.has(reaction))
		{
			return false;
		}

		let arr = this.vAdd.get(reaction);
		if(!arr.includes(user))
		{
			return false;
		}

		this.vAdd.set(reaction, arr.filter(e => e != user));
		return true;
	}

	validateRemove(reaction, user)
	{
		if(!this.vRem.has(reaction))
		{
			return false;
		}

		let arr = this.vRem.get(reaction);
		if(!arr.includes(user))
		{
			return false;
		}

		this.vRem.set(reaction, arr.filter(e => e != user));
		return true;
	}

	/// Discord API does not let us add reactions for users. No autocracy :/
	/*add(reaction, user)
	{
		let arr = this.vAdd.has(reaction) ? this.vAdd.get(reaction) : [];

		if(arr.includes(user))
		{
			console.log('Error: ReactionControl.validateAdd twice on same user: ' + user);
			return false;
		}

		arr.push(user);
		this.vAdd.set(reaction, arr);

		// discord.js action
		reaction.add(user);
	}*/

	async remove(reaction, user)
	{
        if (!reaction) return;

		let arr = this.vRem.has(reaction) ? this.vRem.get(reaction) : [];

		if(arr.includes(user))
		{
			//throw 'Error: ReactionControl.validateRemove twice on the same user: ' + user;
			//console.log('Error: ReactionControl.validateRemove twice on same user: ' + user);
			return;
		}

		arr.push(user);
		this.vRem.set(reaction, arr);

		//console.log('user: ' + user);
		//console.log('reaction: ' + reaction);

		// discord.js action
		return await reaction.remove(user);
	}
}

module.exports = new ReactionControl();
