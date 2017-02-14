var companionApp = angular.module('companionApp', ['ngRoute', 'ngAnimate']);

var cache = (localStorage.codedayCompanion ? JSON.parse(localStorage.codedayCompanion) : { });
var firstOpen = true

companionApp.filter('mapsUrl', function($sce) {
  return function(place){
    return $sce.trustAsResourceUrl("https://www.google.com/maps/embed/v1/place?key=AIzaSyATJIcKruTQnapxp7lxTmnpy-yoMDJEwy0&q=" + encodeURIComponent(place));
  };
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
    .when('/slack', {
      templateUrl: "/views/slack.html",
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
    .otherwise({
      redirectTo: '/'
    });
  
  $locationProvider.html5Mode(true);
});

companionApp.controller('debugController', function($scope){
  $scope.standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  $scope.registration = cache.registration;
  $scope.loggedIn = cache.loggedIn;
  $scope.standalonePlatform = (window.navigator.standalone ? "ios" : (window.matchMedia('(display-mode: standalone)').matches ? "android" : "none"));
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

companionApp.controller('eventController', function($scope, $location){
  var logoTaps = 0;

  if(cache.loggedIn){
    $scope.loggedIn = true;
    $scope.registration = cache.registration;
  }

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

// if('serviceWorker' in navigator){
//   window.addEventListener('load', function() {
//     navigator.serviceWorker.register('/sw.js').then(function(registration) {
//       console.log('SW registered', registration.scope);
//     }).catch(function(err) {
//       console.log('Couldn\'t register SW', err);
//     });
//   });
// }