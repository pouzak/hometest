var mysql = require('promise-mysql');
const geolib = require('geolib');
const readline = require('readline');

//pavyzdines koordinates

var lat = '51.742503';	
var long = '19.432956';



//randa duomenu bazeje gamyklas 1000km spinduliu

var geo = `SELECT
		brewery_id, latitude, longitude,(
		6371 * acos (
		cos ( radians(${lat}) )
		* cos( radians( latitude ) )
		* cos( radians( longitude ) - radians(${long}) )
		+ sin ( radians(${lat}) )
		* sin( radians( latitude ) )
		)
		) AS distance
		FROM geocodes
		HAVING distance < 1000
		ORDER BY distance`;


var getBreweriesInfo = `SELECT geocodes.brewery_id , breweries.brewery_name, geocodes.latitude, geocodes.longitude
		FROM geocodes
		INNER JOIN breweries ON geocodes.brewery_id=breweries.id
		WHERE geocodes.latitude= ? AND geocodes.longitude= ?`;

var getBeerInfo = `SELECT geocodes.brewery_id , beers.name
		FROM geocodes
		INNER JOIN beers on geocodes.id=beers.brewery_id
		WHERE geocodes.latitude= ? AND geocodes.longitude= ?`;


//koordinaciu ivedimas

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
  });
  
  rl.question('Enter you latitude: ', (answer1) => { 		
	  rl.question('Enter you longitude: ', (answer2) => {
		lat = answer1;
		long = answer2;

console.time('Greitaveika: ');



var totalLength = [];
var lengthBetween = [];
var done = false;
var cordinates = [];
var totalBeers = 0;


mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "beerdb"
  }).then(function(conn){
	connection = conn;

	//randamos gamyklos 1000km spinduliu
	return connection.query(geo)
	
}).then(function(cord){
    var points = cord.map(point => { return {latitude: point.latitude,longitude: point.longitude} })
	points.unshift({latitude: lat,longitude: long})
	var currentPoint = points[0];


		//ieskoma arciausiai esanciu gamyklu
	while (!done) {
		var key = (geolib.findNearest(currentPoint, points, 1));
		var nearest = points[key.key]
		if(((totalLength.reduce((a, b) => a + b, 0)) + (geolib.getDistance(
			{latitude: lat, longitude: long }, 
			{latitude: nearest.latitude, longitude: nearest.longitude})/1000)) < 1999){
				cordinates.push(currentPoint)
				lengthBetween.push(totalLength.reduce((a, b) => a + b, 0))
				totalLength.push(key.distance/1000)
				var index = points.indexOf(currentPoint)
				points.splice(index,1)
				currentPoint = nearest 
			
		}else{
			totalLength.push(geolib.getDistance(
				{latitude: lat, longitude: long }, 
				{latitude: currentPoint.latitude, longitude: currentPoint.longitude},1)/1000)
			done = true;
			}	
	}
	
	
}).then(function(){

	//rastu gamyklu rezultatai
	console.log(' ');
	console.log('Found ' + (cordinates.length -1) + ' beer factories.');
	console.log(' ');
	console.log('[Home start -->]: '+ cordinates[0].latitude + ' '+ cordinates[0].longitude + ' - distance: ' +' 0 km');
	console.log('');

	cordinates.map((cor, index)=> {
		connection.query(getBreweriesInfo,[cor.latitude,cor.longitude], (err, result) =>{
			if(err) throw err;
				result.map(res => {
					console.log(
						res.brewery_id + ' --> ' + res.brewery_name  + ': ' + res.latitude + ' - ' + res.longitude + ' - ' + Math.round(lengthBetween[index]) + ' km'
				);	
			});
		});
	});
	console.log(' ');
	console.log('[Home back <--]: '+ cordinates[0].latitude + ' '+ cordinates[0].longitude + ' - ' + totalLength[totalLength.length-1]);

}).then(function(){

	//rastos alaus rusys
	cordinates.map(cor => {
		connection.query(getBeerInfo,[cor.latitude,cor.longitude], (err, result) =>{
			if(err) throw err;
			totalBeers = totalBeers + result.length;
			result.map(res => {
				console.log(res.name);
			});
		});
	});
});

	
	rl.close();
	console.timeEnd('Greitaveika: ');
	});
})

