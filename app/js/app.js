var companionApp = angular.module('companionApp', ['ngRoute', 'ngAnimate']);

var cache = (localStorage.codedayCompanion ? JSON.parse(localStorage.codedayCompanion) : { });

companionApp.config(function($routeProvider, $locationProvider){
  $routeProvider
    .when('/', {
      templateUrl: "views/welcome.html",
      controller: "mainController"
    })
    .when('/login', {
      templateUrl: "views/login.html",
      controller: "loginController"
    })
    .when('/event', {
      templateUrl: "views/event.html",
      controller: "eventController"
    })
    .when('/ticket', {
      templateUrl: "views/ticket.html",
      controller: "ticketController"
    })
    .when('/slack', {
      templateUrl: "views/slack.html",
      controller: "slackController"
    })
    .otherwise({
      redirectTo: '/'
    });
  
  $locationProvider.html5Mode(true);
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
      $scope.verify = true;
      $scope.registration = response.data.registration;
      // $scope.$apply()
    });
  }

  $scope.saveRegistration = function(){
    cache = {
      loggedIn: true,
      registration: $scope.registration
    };

    localStorage.codedayCompanion = JSON.stringify(cache);
    $location.path("/event");
  }
});

companionApp.controller('eventController', function($scope){
  if(cache.loggedIn){
    $scope.loggedIn = true;
    $scope.registration = cache.registration;
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

companionApp.controller('slackController', function($scope){
  // nope
});