/* Cabin Focus - real runway geometry.
   Generated from OurAirports (https://ourairports.com/data/), which is released
   into the public domain. Only the longest runway of each airport is kept: it
   is the one a long haul departure or arrival actually uses.

   headingDeg is the true heading of the low-numbered end, so the whole ground
   scene can be built in a runway-aligned frame and the sun rotated into it. */
(function (global) {
  'use strict';

  const AIRPORTS = {
    seoul: { icao:'RKSI', iata:'ICN', runway:'16L/34R', le:'16L', he:'34R', headingDeg:145.0, lengthM:4000, widthM:60, elevationM:7.0, lighted:true },
    paris: { icao:'LFPG', iata:'CDG', runway:'08L/26R', le:'08L', he:'26R', headingDeg:85.0, lengthM:4215, widthM:45, elevationM:119.5, lighted:true },
    newyork: { icao:'KJFK', iata:'JFK', runway:'13R/31L', le:'13R', he:'31L', headingDeg:121.0, lengthM:4423, widthM:61, elevationM:4.0, lighted:true },
    tokyo: { icao:'RJAA', iata:'NRT', runway:'16R/34L', le:'16R', he:'34L', headingDeg:150.0, lengthM:4000, widthM:60, elevationM:43.0, lighted:true },
    london: { icao:'EGLL', iata:'LHR', runway:'09L/27R', le:'09L', he:'27R', headingDeg:90.0, lengthM:3901, widthM:50, elevationM:25.3, lighted:true },
    rome: { icao:'LIRF', iata:'FCO', runway:'16L/34R', le:'16L', he:'34R', headingDeg:163.0, lengthM:3902, widthM:60, elevationM:4.0, lighted:true },
    barcelona: { icao:'LEBL', iata:'BCN', runway:'06L/24R', le:'06L', he:'24R', headingDeg:66.0, lengthM:3353, widthM:60, elevationM:3.7, lighted:true },
    singapore: { icao:'WSSS', iata:'SIN', runway:'02C/20C', le:'02C', he:'20C', headingDeg:23.0, lengthM:4000, widthM:60, elevationM:6.7, lighted:true },
    bangkok: { icao:'VTBS', iata:'BKK', runway:'01/19', le:'01', he:'19', headingDeg:14.0, lengthM:4000, widthM:60, elevationM:1.5, lighted:true },
    bali: { icao:'WADD', iata:'DPS', runway:'09/27', le:'09', he:'27', headingDeg:88.0, lengthM:2984, widthM:45, elevationM:4.3, lighted:true },
    sydney: { icao:'YSSY', iata:'SYD', runway:'16R/34L', le:'16R', he:'34L', headingDeg:168.0, lengthM:3962, widthM:45, elevationM:6.4, lighted:true },
    auckland: { icao:'NZAA', iata:'AKL', runway:'05R/23L', le:'05R', he:'23L', headingDeg:72.0, lengthM:3635, widthM:45, elevationM:7.0, lighted:true },
    reykjavik: { icao:'BIKF', iata:'KEF', runway:'10/28', le:'10', he:'28', headingDeg:104.0, lengthM:3065, widthM:60, elevationM:52.1, lighted:true },
    zurich: { icao:'LSZH', iata:'ZRH', runway:'16/34', le:'16', he:'34', headingDeg:155.0, lengthM:3700, widthM:60, elevationM:431.9, lighted:true },
    helsinki: { icao:'EFHK', iata:'HEL', runway:'04R/22L', le:'04R', he:'22L', headingDeg:48.0, lengthM:3500, widthM:60, elevationM:54.6, lighted:true },
    honolulu: { icao:'PHNL', iata:'HNL', runway:'08L/26R', le:'08L', he:'26R', headingDeg:90.0, lengthM:3767, widthM:61, elevationM:4.0, lighted:false },
    vancouver: { icao:'CYVR', iata:'YVR', runway:'08R/26L', le:'08R', he:'26L', headingDeg:100.3, lengthM:3505, widthM:61, elevationM:4.3, lighted:true },
    dubai: { icao:'OMDB', iata:'DXB', runway:'12R/30L', le:'12R', he:'30L', headingDeg:121.0, lengthM:4447, widthM:60, elevationM:18.9, lighted:true },
    istanbul: { icao:'LTFM', iata:'IST', runway:'17L/35R', le:'17L', he:'35R', headingDeg:174.0, lengthM:4100, widthM:60, elevationM:99.1, lighted:true },
    cairo: { icao:'HECA', iata:'CAI', runway:'05R/23L', le:'05R', he:'23L', headingDeg:49.2, lengthM:4000, widthM:60, elevationM:98.1, lighted:true },
    losangeles: { icao:'KLAX', iata:'LAX', runway:'7L/25R', le:'7L', he:'25R', headingDeg:83.0, lengthM:3930, widthM:46, elevationM:38.1, lighted:true }
  };

  global.Airports = {
    get: function (key) { return AIRPORTS[key] || null; },
    all: AIRPORTS
  };
})(window);
