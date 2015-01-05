var config = {}

config.web = {};
config.db = {};
config.files = {};

config.web.port = process.env.WEB_PORT || 9980;
config.web.url = "http://localhost:5000/";


config.db.uristring = process.env.MONGOHQ_URL || 'mongodb://localhost/visualifico';

config.files.log = "visualifico.log";

module.exports = config;
