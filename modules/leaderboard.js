const util = require('../util/util');
const mongoUtil = require('../util/mongo');

const max_per_leaderboard_message = 10;

class C6Leaderboard
{
	constructor() {
		util.client.on('ready', () =>
        {
            this.generate();
        });
	}

	getWinPercentage(wins, losses)
	{
		return (wins == 0 ? 0 : (losses == 0 ? 100 : Math.round(100 * wins / (wins+losses))));
	}
	
	async generate()
	{
		try
		{
			// Grab data
			this.leaderboard = await util.makeRGRequest('leaderboard.php', {});
			
			// Publish new Leaderboard
			this.publishLeaderboard();

            //glicko2
            this.glickoLb = await mongoUtil.getLeaderboard();
            this.publishGlickoLeaderboard();
		}
		catch(err)
		{
			console.log('[leaderboard_err]' + err);
		}
	}
	
    async publishGlickoLeaderboard()
    {
        const channel = util.getChannel('569706256055402537');
		const messages = [
			'570810132208943104',
            '570810134490513410',
            '570810135681695754',
            '570810137108021248',
            '570810138185957376',
			'570810158293450792',
            '570810159274655781',
            '570810160629415947',
            '570810161611014145',
            '570810163053985793'
		];
        //let fetched = await channel.fetchMessages({limit: 100});
        //await channel.bulkDelete(fetched);

        const max = this.glickoLb.length < 100 ? this.glickoLb.length : 100;

        let msg = ''
        let j = 0;
        for ( var i = 0; i < max ; i++ ) {
            if ( i < 9 ) msg += '`#0' + (i+1) + '`\t`';
            else msg += '`#' + (i+1) + '`\t`';
            msg += Math.round(this.glickoLb[i].rating) + '`\t<@' + this.glickoLb[i]._id + '>\t' + '`rd: ' +  Math.round(this.glickoLb[i].round) + '`\n';
            if ( ((i+1) % 10) == 0 ) {
                //channel.send(msg);
                var m = await channel.fetchMessage(messages[j]);
                m.edit(msg);
                msg = '';
                j++
            }
        }
    }

	async publishLeaderboard()
	{
        const channel = util.getChannel(483346000233365526);
		const messages = [
			'544328293927878666',
            '544328296918155264',
            '544328298084433922',
            '544328300127059988',
            '544328301657849866',
			'544328321853554733',
            '544328323795386398',
            '544328325372575744',
            '544328326744113162',
            '544328328379760650'
		];

		let i = 0;
		const max_top = this.leaderboard.length < 100 ? this.leaderboard.length : 100;		
		for(const m of messages)
		{
			const msg = await channel.fetchMessage(m);
			const content_new = this.createLeaderboard(i, max_top);

			if( msg.content != content_new) msg.edit( content_new );
			i += max_per_leaderboard_message;
		}
	}
	
	createLeaderboard(i, max_top)
	{	
		let msg = '**Top ' + (i+max_per_leaderboard_message) + '**';
		const max_i = i + (max_top - i < max_per_leaderboard_message ? max_top - i : max_per_leaderboard_message);
		for(; i < max_i; ++i)
		{
			let n = (i+1);
			if(n >= 10 && n <= 20) n += 'th';
			else if(n % 10 == 1) n += 'st';
			else if(n % 10 == 2) n += 'nd';
			else if(n % 10 == 3) n += 'rd';
			else n += 'th';
			
			// Construct win_percentage
			const s = this.leaderboard[i];
			let win_percentage = this.getWinPercentage(s.wins, s.losses).toString() + '%'; while(win_percentage.length < 4) win_percentage = ' ' + win_percentage;
			let wins = s.wins.toString(); while(wins.length < 4) wins = ' ' + wins;
			//let losses = s.losses.toString(); while(losses.length < 4) losses = ' ' + losses;
			let losses = s.losses.toString(); while(losses.length < 4) losses += ' ';
			
			// split columns
			//msg += '\n`' + s.rating + ' ' + win_percentage + ' `'; //len: 12 (12)
			//msg += ' `W ' + wins + '` `L ' + losses + '`'; //len: 18 (30)
			
			// W-L one column
			//msg += '\n`' + s.rating + ' ' + win_percentage + ' ';
			//msg += ' ' + wins + 'W ' + losses + 'L`';
			
			msg += '\n`' + s.rating + ' ' + win_percentage + '  ';
			msg += '[' + wins + '-' + losses + ']`';
			// len 25 (25)
			
			// Best' Civ
			if(s.civ != null) msg += ' ' + util.getCivEmojiByDBID(s.civ); //len: 21 (51) + maxcivemoji
			
			msg += ' <@' + s.id + '> **(' + n + ')**'; //len: 35 (86) + maxcivemoji
		}
		
		//[length_per_line] 86 + maxcivemoji ( scotland: 28) => 118
		//console.log('[msg_total]' + msg.length);
		return msg;
	}
}

module.exports = new C6Leaderboard();
