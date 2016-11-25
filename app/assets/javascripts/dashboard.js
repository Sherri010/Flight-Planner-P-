var app = angular.module("flightApp", ["ui.router"]);




app.config(function($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state("map", {
            url: "/map",
            abstract: true,
            templateUrl: "pages/map.html",
            controller: "MapController"
        })
        .state("map.newplan", {
            url: "/new-plan",
            templateUrl: "pages/plan.html",
            controller: "PlanController"
        })
        .state("map.weather", {
            url: "/weather",
            templateUrl: "pages/weather.html",
            controller: "WeatherController"
        })
        .state("map.airports", {
            url: "/airports",
            templateUrl: "pages/airports.html",
            controller: "AirportController"
        })
        .state("map.savedplan",{
            url: "/saved-plans",
            templateUrl: "pages/saved.html",
            controller: "HistroyController"
        });

    $urlRouterProvider.otherwise("/map/new-plan");
});


///MAP
app.controller('MapController', function($scope) {
   $scope.labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $scope.labelIndex = 0;
    $scope.marker_list = [];
    $scope.distances=[];
    $scope.totalDistance=0;
    $scope.coordinates=[];

    function calcDistance(){
      if ($scope.coordinates.length == 1 )
        { $scope.$apply(function () {
            $scope.distances.push(0);
          });
            return;
        }

      var lat1 = $scope.coordinates[$scope.coordinates.length-2].lat;
      var lat2 = $scope.coordinates[$scope.coordinates.length-1].lat;
      var lon1 = $scope.coordinates[$scope.coordinates.length-2].lng;
      var lon2 = $scope.coordinates[$scope.coordinates.length-1].lng;
      var radlat1 = Math.PI * lat1/180
    	var radlat2 = Math.PI * lat2/180
    	var theta = lon1-lon2
    	var radtheta = Math.PI * theta/180
    	var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    	dist = Math.acos(dist)
    	dist = dist * 180/Math.PI
    	dist = dist * 60 * 1.1515
    	//if (unit=="K") { dist = dist * 1.609344 }
      //if (unit=="N") { dist = dist * 0.8684 }
      dist= dist *  0.8684;
       $scope.$apply(function () {
      $scope.distances.push(dist);
      console.log("Distance:",$scope.distances);
      $scope.totalDistance += dist;
    });
    }

    function initMap() {
        var map = new google.maps.Map(document.getElementById('map'), {
            zoom: 9,center: {lat: 37.712, lng: -122.213},
            streetViewControl: true,
            mapTypeId: 'terrain'
        });


        google.maps.event.addListener(map, 'click', function(event) {
            var new_marker ={lat:event.latLng.lat(),lng:event.latLng.lng() };

            $scope.coordinates.push(new_marker);
            addMarker(event.latLng, map);

            $scope.$broadcast("flightapp:newmarker",new_marker);

            calcDistance();

            var flightPath = new google.maps.Polyline({
                path: $scope.coordinates,
                geodesic: true,
                strokeColor: '#ff0000',
                strokeOpacity: 1.0,
                strokeWeight: 4
            });
            flightPath.setMap(map);
        });

        $scope.$on("flightapp:shownodes",function(event,data) {
            console.log("got into apply");
            console.log(data)
            $scope.coordinates = data;
            var flightPath = new google.maps.Polyline({
                path: $scope.coordinates,
                geodesic: true,
                strokeColor: '#ff0000',
                strokeOpacity: 1.0,
                strokeWeight: 4
            });
            flightPath.setMap(map);
        });

        //delete all nodes from the map
        function setMapOnAll(map) {
          console.log("in set map delete",$scope.marker_list)
         for (var i = 0; i <  $scope.marker_list.length; i++) {
          $scope.marker_list[i].setMap(null);
         }
        }

        //event listener for deleting marker from unsaved route
        $scope.$on("flightapp:updatemap",function(){
          console.log("im in update now,removing all nodes first");
          setMapOnAll(null);
        });

        //for adding info window to the marker
        var overlay = new google.maps.OverlayView();
        overlay.draw = function() {};
        overlay.setMap(map);

        function addMarker(location, map) {
            var marker = new google.maps.Marker({
                position: location,
                label: $scope.labels[$scope.labelIndex++ % $scope.labels.length],
                map: map
            });
           $scope.marker_list.push(marker);
           console.log("from addmarker",$scope.marker_list)
           //shows the coordinates in the console when hover
            google.maps.event.addListener(marker, 'mouseover', function() {
                var projection = overlay.getProjection();
                var pixel = projection.fromLatLngToContainerPixel(marker.getPosition());
                console.log(marker.position.lat(),marker.position.lng());
            });
            var infoContent = "<b>Lat:</b> "+ marker.position.lat().toString()+" | <b>lng:</b>"+ marker.position.lng().toString();
            var infowindow = new google.maps.InfoWindow({
              content: infoContent
            });
            marker.addListener('click', function() {
              infowindow.open(map, marker);
            });
        }

    }

    initMap();
});


///Plan
app.controller('PlanController', function($scope,$http) {
  //getting user
  var user = document.getElementById('user').getAttribute("value");
  $scope.save_flag=false;
  $scope.success_save=false;
  $scope.routeName = null;
  $scope.route ={};
  $scope.speed;
  $scope.travelTime;
 // listening for any changes on the marker list and updating the view
  $scope.$on("flightapp:newmarker", function(event,data) {
     $scope.$apply(function () {
      if($scope.coordinates.length)
        $scope.save_flag=true;
        $scope.success_save=false;
    });
  });


 $scope.saveRoute=function(){
  var route_id=null;
   //creating route if id is not available
   if ($scope.routeName)
     {
      $http({
           method: "POST",
           url: "http://localhost:3000/routes",
           data: {
               route:{name:$scope.routeName,user_id:user,distance:34500}
           }
       }).success(function(data) {
            route_id=data.id;
            console.log(data, " ",route_id);
            // if success at the nodes to created route
            $http({
                    method: "POST",
                    url: "http://localhost:3000/routes/"+route_id+"/nodes",
                    data: {
                        node:$scope.coordinates
                  }
                }).success(function(data) {
                     alert("SUCCESS");
                     $scope.save_flag=false;
                     $scope.success_save=true;
                }).error(function() {
                    alert("Error saving nodes!");
                });
       }).error(function() {
           alert("Error saving route!");
       });
    }else {
      alert("name the route");
    }
 }

 $scope.calcSpeed = function(){
    var mph = $scope.speed * 1.152;
    $scope.travelTime = $scope.totalDistance / mph;
    console.log($scope.travelTime);
 }

 $scope.removeNode=function(node_index){
    $scope.marker_list.splice(node_index,1);
    $scope.coordinates = $scope.marker_list;
    console.log("coor",$scope.coordinates);
    console.log("marker",$scope.marker_list);
    $scope.$emit("flightapp:updatemap");
  }
});


//saved routes
app.controller('HistroyController',function($scope,$http){
  $scope.allRoutes;
  $scope.nodes;
  getAllRoute();

  function getAllRoute(){
  $http({
          method: "GET",
          url: "http://localhost:3000/routes/",
       }).success(function(data) {
           $scope.allRoutes = data;
      }).error(function() {
          alert("Error finding routes!");
      });

 }
 //get routes details
  $scope.getNodes=function(id){
       $http({
            method: "GET",
            url: "http://localhost:3000/routes/"+id,
         }).success(function(data) {
             $scope.nodes = data.nodes;
             $scope.$emit("flightapp:shownodes",$scope.nodes);
        }).error(function() {
            alert("Error finding routes!");
        });
  }

  //delete route
  $scope.removeRoute=function(id){

    $http({
            method: "DELETE",
            url: "http://localhost:3000/routes/"+id,
         }).success(function(data) {
            //update the view
            getAllRoute();
        }).error(function() {
            alert("Error deleting routes!");
        });
  }

});



//WEATHER
app.controller('WeatherController', function() {
    var vm = this;
    vm.message = 'weahter api data';
});

///Airport
app.controller('AirportController',function(){
    var vm=this;
    vm.message = 'airport list api';
});
