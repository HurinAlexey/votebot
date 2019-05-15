const util = require('../util/util');
const Discord = require('discord.js');

var moderatorId = '291753249361625089';

function GetChannelSubLog() { return util.getChannel(371831587001729036); }

class SubBotModule
{
    constructor()
    {
        util.client.on('message', async message => {
            if(message.author.bot) return;
            if(message.channel.type === "dm") return;
            
            let prefix = ".";
            let messageArray = message.content.split(" ");
            let cmd = messageArray[0];
            let args = messageArray.slice(1);
            
            if( cmd == "!reportsub" || cmd == ".reportsub" && message.member.roles.has(moderatorId) ) {
                let rUser = message.guild.member(message.mentions.users.first() || message.guildes.members.get(args[0]));
                if(!rUser)  return message.channel.send("Couldn't find user.");
                let reason = args.join(" ").slice(22);
                let reportEmbed = new Discord.RichEmbed()
                
                .setDescription("Reports")
                .setColor("#4256f4")
                .addField("Reported User", `${rUser} with ID: ${rUser.id}`)
                .addField("Reported By", `${message.author} with ID: ${message.author.id}`)
                .addField("Channel", message.channel)
                .addField("Time", message.createdAt)
                .addField("Reason", reason);
                
                GetChannelSubLog().send(reportEmbed);
                message.delete();
            }
        })
    }
}

module.exports = new SubBotModule();
