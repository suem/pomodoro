/**
 * @jsx React.DOM
 */

Date.prototype.yyyymmdd = function() {         
  var yyyy = this.getFullYear().toString();                                    
  var mm = (this.getMonth()+1).toString(); // getMonth() is zero-based         
  var dd  = this.getDate().toString();             
  return yyyy + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + (dd[1]?dd:"0"+dd[0]);
};  


function Service(onTimeUpdate, onUnitStarted, onUnitDone) {
  this.shortPauseTime = 5*60;
  this.longPauseTime = 20*60;
  this.pomodoroTime = 20*60;

  this.history = [];
  this.currentUnit = {type:'pomodoro', duration: this.pomodoroTime} 
  this.time = this.currentUnit.duration;
  this.running = false;

  this.addNextUnit = function () {
    this.history.push(this.currentUnit)
    var lastIndex = this.history.length-1;
    var lastUnit = this.history[lastIndex];
    if(lastUnit.type == 'pomodoro') {
      var longPause= [lastIndex-1, lastIndex-3, lastIndex-5].map(
        function (index) { return this.history[index] && this.history[index].duration == this.shortPauseTime}.bind(this)
      ).reduce(function (a,b) { return a && b; }, true);
      this.currentUnit = {type: 'pause', duration: (longPause ? this.longPauseTime : this.shortPauseTime)}
    } else if(lastUnit.type == 'pause') {
      this.currentUnit = {type: 'pomodoro', duration: this.pomodoroTime}
    }
  }



  this.startUnit = function () {
    if(!this.running) {
      this.running = true;
      this.time = this.currentUnit.duration;
      onTimeUpdate();
      this.intervalHandle = setInterval(function () {
        this.time = this.time - 1;
        onTimeUpdate(); 
        if(this.time == 0) {
          this.running = false; 
          this.addNextUnit();
          onUnitDone(this.history[this.history.length-1]);
          clearInterval(this.intervalHandle);
        }
      }.bind(this), 1000);
      onUnitStarted(this.currentUnit);
    } else {
      console.log('tried to start unit while already running'); 
    }
  }

  this.skipUnit = function () {
    clearInterval(this.intervalHandle);
    this.running = false; 
    this.addNextUnit();
    this.time = 0;
    onUnitDone(this.history[this.history.length-1]);
  }

}

var History = React.createClass({displayName: 'History',
  render: function() {
    var history = this.props.history;
    return (React.DOM.div(null, history.map(this.renderUnit), " " ))
  },
  renderUnit: function (unit,index) {
    if(unit.type == 'pomodoro') return React.DOM.img( {key:index, className:"pomodoro", src:"img/tomato2.svg"})
    else {
      var size = Math.floor(unit.duration / 200);
      var style={marginLeft:size+'px', marginRight:size+'px'}
      return React.DOM.span( {style:style})
    }
  }
});

var App = React.createClass({displayName: 'App',
  componentWillMount: function () {
    var onTimeUpdate = function () { this.forceUpdate(); }.bind(this);
    var onUnitStarted = function (unit) {
      this.forceUpdate();
      if(unit.type == "pomodoro") this.startTicking();
      console.log('started unit');
    }.bind(this)
    var onUnitDone = function (unit) {
      this.forceUpdate();
      if(unit.type == "pomodoro") this.stopTicking();
      this.playBell();
      console.log('stoped unit');
    }.bind(this)
    this.setState({service: new Service(onTimeUpdate, onUnitStarted, onUnitDone)})
  },
  playBell: function () {
      var audio = this.refs.bellAudio.getDOMNode();
      audio.currentTime = 0;
      audio.play();
  },
  startTicking: function () {
      var audio = this.refs.tickingAudio.getDOMNode();
      audio.currentTime = 0;
      audio.play();
  },
  stopTicking: function () {
      var audio = this.refs.tickingAudio.getDOMNode();
      audio.pause();
  },
  seconds: function (time) {
    return time % 60;
  },
  minutes: function (time) {
    return Math.floor(time / 60);
  },
  pad: function (num, size) {
    return ('000000000' + num).substr(-size); 
  },
  render: function() {
    var service = this.state.service;
    var start = function () { service.startUnit(); return false;}
    var skip = function () { service.skipUnit(); return false;}

    var timerButton;
    if(service.running) {
      timerButton = (React.DOM.span(null, 
        this.pad(this.minutes(service.time),2),":",this.pad(this.seconds(service.time),2)
      ))
    } else {
      var text;
      if(service.currentUnit.type == "pomodoro") text = "Start next pomodoro"
      else text = "Have a break"
      timerButton = React.DOM.a( {href:"#", className:"btn btn-default  btn-lg", onClick:start}, text)
    }
    var iconSrc = service.currentUnit.type == "pomodoro" ? "img/tomato1.svg" : "img/coffee.svg";
    var iconClass = 'col-xs-2 icon text-center ' + (service.running ? 'spin' : 'nospin');
    var skipStyle = (service.running ? {} : {visibility: "hidden"}); 

    return (
      React.DOM.div( {className:"container main"},  

        React.DOM.div( {className:"row"}, 
          React.DOM.img( {className:iconClass, src:iconSrc}),
          React.DOM.div( {className:"col-xs-4 timer"}, timerButton)
        ),
        React.DOM.div( {className:"row", style:skipStyle}, 
          React.DOM.a( {href:"#", className: " col-xs-offset-2 col-xs-1 btn btn-default btn-sm", onClick:skip}, "skip")
        ),
        History( {history:service.history} ),
        React.DOM.audio( {src:"sounds/ticking.mp3", loop:"true", ref:"tickingAudio"}), 
        React.DOM.audio( {src:"sounds/bell.mp3", ref:"bellAudio"}) 
      )
    )
  }
});


React.renderComponent( App(null ), document.getElementById('container'));
