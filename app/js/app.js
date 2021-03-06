var companionApp = angular.module('companionApp', ['ngRoute', 'ngAnimate']);

var cache = (localStorage.codedayCompanion ? JSON.parse(localStorage.codedayCompanion) : { });

companionApp.filter('mapsUrl', function($sce) {
  return function(place){
    return $sce.trustAsResourceUrl("https://www.google.com/maps/embed/v1/place?key=AIzaSyATJIcKruTQnapxp7lxTmnpy-yoMDJEwy0&q=" + encodeURIComponent(place));
  };
});

var messaging, nowPlaying;

angular.element(document).ready(function(){
  messaging = firebase.messaging();
});

companionApp.config(function($routeProvider, $locationProvider){
  $routeProvider
    .when('/', {
      templateUrl: "/views/welcome.html",
      controller: "mainController"
    })
    .when('/login', {
      templateUrl: "/views/login.html",
      controller: "loginController"
    })
    .when('/login/:id', {
      templateUrl: "/views/deeplink_login.html",
      controller: "loginDeeplinkController"
    })
    .when('/event', {
      templateUrl: "/views/event.html",
      controller: "eventController"
    })
    .when('/ticket', {
      templateUrl: "/views/ticket.html",
      controller: "ticketController"
    })
    .when('/chat', {
      templateUrl: "/views/chat.html",
      controller: "slackController"
    })
    .when('/help', {
      templateUrl: "/views/help.html",
      controller: "helpController"
    })
    .when('/schedule', {
      templateUrl: "/views/schedule.html",
      controller: "scheduleController"
    })
    .when('/info', {
      templateUrl: "/views/info.html",
      controller: "infoController"
    })
    .when('/reset', {
      templateUrl: "/views/welcome.html",
      controller: "resetController"
    })
    .when('/template', {
      templateUrl: "/views/template.html",
      controller: "templateController"
    })
    .when('/settings', {
      templateUrl: "/views/settings.html",
      controller: "settingsController"
    })
    .when('/debug', {
      templateUrl: "/views/debug.html",
      controller: "debugController"
    })
    .when('/nowplaying', {
      templateUrl: "views/nowplaying.html",
      controller: "nowPlayingController"
    })
    .otherwise({
      redirectTo: '/'
    });
  
  $locationProvider.html5Mode(true);
});

companionApp.controller('debugController', function($scope){
  $scope.iid = "";
  $scope.standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  $scope.registration = cache.registration;
  $scope.loggedIn = cache.loggedIn;
  $scope.standalonePlatform = (window.navigator.standalone ? "ios" : (window.matchMedia('(display-mode: standalone)').matches ? "android" : "none"));

  messaging.getToken()
    .then(function(currentToken) {
      if(currentToken){
        $scope.iid = currentToken;
      }else{
        $scope.iid = "(none)";
      }
    })
    .catch(function(err) {
      $scope.iid = "(error getting iid)";
    });
});

companionApp.controller('nowPlayingController', function($scope, $location){
  // ???
});

companionApp.controller('resetController', function($scope, $location){
  cache = { }
  localStorage.codedayCompanion = ""
  $location.path("/")
});

companionApp.controller('mainController', function($scope, $location){
  if(cache.loggedIn) $location.path("/event");
});

companionApp.controller('loginController', function($scope, $http, $location){
  $scope.registration = { };

  $scope.findAttendee = function(){
    $scope.working = true
    $http({
      method: "GET",
      url: "/api/login?email=" + encodeURIComponent($scope.email)
    }).then(function(response){
      $scope.working = false;
      if(response.data.ok){
        $scope.verify = true;
        $scope.registration = response.data.registration;
      }else{
        alert(response.data.message)
      }
    });
  }

  $scope.saveRegistration = function(){
    $http({
      method: "GET",
      url: "/api/staff?event=" + encodeURIComponent($scope.registration.event.id)
    }).then(function(response){
      cache = {
        loggedIn: true,
        registration: $scope.registration,
        eventStaff: response.data.staff
      };

      messaging.requestPermission()
        .then(function() {
          // success! we have notification permissions
          messaging.getToken()
            .then(function(currentToken) {
              if(currentToken){
                $http({
                  method: "GET",
                  url: "/api/associate?id=" + $scope.registration.id + "&token=" + currentToken
                })
              }
            })
            .catch(function(err) {
              console.error(err);
              alert("We couldn't register you for push notifications :(\nWe'll try again later.");
            });
        })
        .catch(function(err) {
          // oh well, we can prompt the user later...
        });

      localStorage.codedayCompanion = JSON.stringify(cache);

      $location.path("/event");
    });
  }
});

companionApp.controller('loginDeeplinkController', function($scope, $routeParams, $http){
  $scope.registrationFound = false;

  $http({
    method: "GET",
    url: "/api/login?id=" + encodeURIComponent($routeParams.id)
  }).then(function(response){
    if(response.data.ok){
      $scope.verify = true;
      $scope.registration = response.data.registration;

      $http({
        method: "GET",
        url: "/api/staff?event=" + encodeURIComponent($scope.registration.event.id)
      }).then(function(response){
        cache = {
          loggedIn: true,
          registration: $scope.registration,
          eventStaff: response.data.staff
        };

        localStorage.codedayCompanion = JSON.stringify(cache);

        $scope.registrationFound = true;
      });
    }else{
      alert(response.data.message);
    }
    // $scope.$apply()
  });
});

companionApp.controller('eventController', function($scope, $location, $http){
  var logoTaps = 0;
  $scope.nowPlaying = null;

  if(cache.loggedIn){
    $scope.loggedIn = true;
    $scope.registration = cache.registration;
  }else{
    $location.path("/");
  }

  $http({
    method: "GET",
    url: "/spotify/nowplaying?event=" + encodeURIComponent($scope.registration.event.id)
  }).then(function(response){
    if(response.data.isPlaying){
      $scope.nowPlaying = response.data.artist + " — " + response.data.title;
    }
  })

  $scope.tapLogo = function(){
    logoTaps++;
    if(logoTaps === 10) $location.path("/debug");
  }
});

companionApp.controller('ticketController', function($scope){
  if(cache.loggedIn){
    $scope.loggedIn = true;
    $scope.registration = cache.registration;
  }else{
    $location.path("/");
  }
});

companionApp.controller('helpController', function($scope){
  if(cache.loggedIn){
    $scope.staff = cache.eventStaff;
  }else{
    $location.path("/");
  }
});

companionApp.controller('scheduleController', function($scope){
  $scope.eventSchedule = cache.registration.event.schedule;
});

companionApp.controller('infoController', function($scope){
  if(cache.loggedIn){
    $scope.loggedIn = true;
    $scope.registration = cache.registration;
  }else{
    $location.path("/");
  }
});

companionApp.controller('slackController', function($scope){
  // nope
});

companionApp.controller('settingsController', function($scope, $location){
  // You can redirect to a different path with $location.path("/path")
  // For example: `$location.path("/event")` would redirect to the event page...
  if(cache.loggedIn){
    // Check if the user is logged in with <el ng-if="loggedIn">...</el>
    $scope.loggedIn = true;
    // Access the registration object in the view with {{ registration }}
    $scope.registration = cache.registration;
  }
})

companionApp.controller('templateController', function($scope, $location){
  // You can redirect to a different path with $location.path("/path")
  // For example: `$location.path("/event")` would redirect to the event page...
  if(cache.loggedIn){
    // Check if the user is logged in with <el ng-if="loggedIn">...</el>
    $scope.loggedIn = true;
    // Access the registration object in the view with {{ registration }}
    $scope.registration = cache.registration;
  }
})
