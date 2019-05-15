const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://cplbot:brokenarrow@localhost:27017/test_db';

process.on("uncaughtException", (err) => {
  console.log("mongoUtil " +  err);
});

var _cli
var _db;
var _coll;

module.exports = {
    connectToMongo: function () {
        MongoClient.connect(url, { useNewUrlParser: true, poolSize: 10 }, function (err, client) {
            _cli  = client;
            _db   = _cli.db('test_db');
            _coll = _db.collection('ranked');
            console.log('mongo listening');
        });
    },

    getDb: function() {
        return _db;
    },
    
    createPlayer: async function ( discordId, steamId ) {
        _coll.insertOne({
            _id:        discordId,
            steam_id:   steamId,
            rating:     1500,
            round:      250,
            volume:     0.06,
            tau:        0.02,
            games:      0,
            wins:       0,
            losses:     0
        });
    },

    getPlayer: async function ( playerId ) {
        return _coll.findOne({ _id: playerId });
    },
    
    updatePlayer: async function(playerId, skill, diff, rd, vol) {
        _coll.updateOne({ _id : playerId }, {
            $set: {
                rating: skill,
                lastChange: diff,
                round:  rd,
                volume: vol
            },
            $currentDate: { lastModified: true }
        });
    },

    getLeaderboard: async function ( playerId ) {
        return _coll.find().sort({ rating: -1 }).toArray();
    }
}
