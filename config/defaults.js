
/*
 * This file contains all the constants to be used in the entire application.
 */

const config = {};

config.jwtSecret                = 'curwinBusinessAdmin';
config.dateTimeFormat           = 'YYYY-MM-DD HH:mm:ss';
config.dateFormat               = 'YYYY-MM-DD';
config.timeFormat               = 'HH:mm:ss';
config.month                    = 'MMMM';
config.monthAndYear             = 'MMM-YY';
config.year                     = 'Y';
config.resultSetLimit           = 20;
config.offsetValue              = 0;
config.page                     = 0;
config.sortBy                   = {'DESC' : 'DESC', 'ASC' : 'ASC'};
config.sortOrder                = 'DESC';
config.tokenDuration            = '10h';

module.exports = config;