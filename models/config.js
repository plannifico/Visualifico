/*
Visualifico 0.0.1 - Visual analytics for MongoDB
Copyright (C) 2015  Rosario Alfano

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>
*/


var config = {}

config.web = {};
config.db = {};
config.files = {};

config.web.port = process.env.WEB_PORT || 9980;
config.web.url = "http://localhost:5000/";


config.db.uristring = process.env.MONGOHQ_URL || 'mongodb://localhost/visualifico';

config.files.log = "visualifico.log";

module.exports = config;
