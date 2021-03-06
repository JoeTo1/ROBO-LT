
(function(ext) {
	
	// the current sensor values from the device
	ext.currentValues = null;
	
	// the previous values from the device (for change detection)
	ext.oldValues = null;
		
	// Cleanup function when the extension is unloaded
	ext._shutdown = function() {};
	
	// Status reporting code
	// Use this to report missing hardware, plugin or unsupported browser
	ext._getStatus = function() {
		return IO.updateStatus();
	};
	
	// reset the device
	ext.reset = function() {
		IO.doGet('reset');
	};
	
	// set the output [-100:+100]
	ext.setOutputPercent = function(output, speed) {
		switch(output) {
			case 'M1':	IO.doPost('setOutput', {idx: 0, speed: Math.round(speed)}); break;
			case 'M2':	IO.doPost('setOutput', {idx: 1, speed: Math.round(speed)}); break;
			default:	throw "error";
		}
	};
		
	// get the current output [-100:+100]
	ext.getOutputPercent = function(output) {
		switch(output) {
			case 'M1':	return this.currentValues.m1_percent;
			case 'M2':	return this.currentValues.m2_percent;
			default:	return false;
		}
	}
	
	// get the current value of the Ix input: [0:100]
	ext.getInputPercent = function(sensor) {
		if (this.currentValues == null) {return 0;}
		switch(sensor) {
			case 'I1': return this.currentValues.ax_percent;
			case 'I2': return this.currentValues.ay_percent;
			case 'I3': return this.currentValues.a1_percent;
		}
	};
	
	// get the difference between the last two readings for the given sensor (returns false on errors)
	ext.getInputDelta = function(sensor) {
		if (this.currentValues == null)	{return false;}
		if (this.oldValues == null)		{return false;}
		switch(sensor) {
			case 'I1':	return (this.currentValues.ax_percent - this.oldValues.ax_percent);
			case 'I2':	return (this.currentValues.ay_percent - this.oldValues.ay_percent);
			case 'I3':	return (this.currentValues.a1_percent - this.oldValues.a1_percent);
			default:	return false;
		}
	}
	
	// update the current sensor values from the device
	ext.doUpdate = function() {
		IO.doGet('getSensors')
			.done(function(data) {
				ext.oldValues = ext.currentValues;
				ext.currentValues = data;
			})
			.fail(function( xhr, status, err ) {
				console.log(err);						// DEBUG
			});
	};
	
	
	
	
	
	// get the current [0,1] value for a button attached to Ix
	ext.getButtonBinary = function(sensor) {
		return this.getInputPercent(sensor) < 15;
	}
	
	// get the current [0,1] value for a light-barrier attached to Ix
	ext.getLightBarrierBinary = function(sensor) {
		return this.getInputPercent(sensor) > 15;
	}
	
	// returns true when the value for the given input changed by +/- 15%
	ext.onButtonChange = function(sensor, direction) {
		var diff = this.getInputDelta(sensor);
		if		(diff === false) {return false;}
		if		(direction == getButtonState('pressed'))		{return diff < -15;}		// 15% down
		else if	(direction == getButtonState('released'))		{return diff < +15;}		// 15% up
		else													throw "error";
	}
	
	// returns true when the value for the given input changed by +/- 15%
	ext.onLightBarrierChange = function(sensor, direction) {
		var diff = this.getInputDelta(sensor);
		if		(diff === false) {return false;}
		if		(direction == getLightBarrierState('closes'))	{return diff < +15;}		// 15% up
		else if (direction == getLightBarrierState('opens'))	{return diff < -15;}		// 15% down
		else													throw "error";
	}
	
	// get the current output of Mx [-8:+8]
	ext.getOutputVal = function(output) {
		return Math.round(this.getOutputPercent(output) / 100 * 8)
	}

	// set he current output of Mx to [-8:+8]
	ext.setOutputVal = function(output, val) {
		this.setOutputPercent(output, val * 100 / 8);
	}
	
	// set the brightness of a lamp attached to Mx
	ext.setLampVal = function(output, val) {
		this.setOutputVal(output, val);
	}
	
	// set the speed [0:8] and direction of a motor attached to Mx
	ext.setMotorValDir = function(output, speed, dir) {
		if		(dir == getMotorDirection('forward'))	{this.setOutputVal(output, +speed);}
		else if	(dir == getMotorDirection('backwards'))	{this.setOutputVal(output, -speed);}
		else											throw 'error';
	}

	// set the direction of a motor attached to Mx
	ext.setMotorDir = function(output, dir) {
		var speed = this.getOutputVal(output);
		if		(dir == getMotorDirection('forward'))	{this.setOutputVal(output, +Math.abs(speed));}
		else if	(dir == getMotorDirection('backwards'))	{this.setOutputVal(output, -Math.abs(speed));}
		else											throw 'error';
	}
		
	// Block and block menu descriptions
	var descriptor = {
		
		blocks: [
			
			// events
			['h', Lang.get('evtButton'),			'onButtonChange',		'I1', getButtonState('pressed')],
			['h', Lang.get('evtLightBarrier'),		'onLightBarrierChange',	'I3', getLightBarrierState('opens')],
			
			// gets
			['b', Lang.get('getButton'),			'getButtonBinary',		'I1'],
			['b', Lang.get('getLightBarrier'),		'getLightBarrierBinary','I3'],
			['r', Lang.get('getOutputValue'),		'getOutputVal',			'M1'],
			
			// sets
			[' ', Lang.get('setLampVal'),			'setLampVal',			'M1', 0],
			[' ', Lang.get('setMotorValDir'),		'setMotorValDir',		'M1', 0, getMotorDirection('forward')],
			[' ', Lang.get('setMotorDir'),			'setMotorDir',			'M1', getMotorDirection('forward')],
			[' ', Lang.get('setOutputVal'),			'setOutputVal',			'M1', 0],

			[' ', Lang.get('reset'),				'reset'],
			
		],
		
		menus: {
			inputs:				['I1', 'I2', 'I3'],
			buttonStates:		[getButtonState('pressed'), getButtonState('released')],
			lightBarrierStates:	[getLightBarrierState('opens'), getLightBarrierState('closes')],
			outputs:			['M1', 'M2'],
			outputValues:		[0, 1, 2, 3, 4, 5, 6, 7, 8],
			outputDirections:	[getMotorDirection('forward'), getMotorDirection('backwards')],
		},
		
		url: 'http://www.fischertechnik.de/desktopdefault.aspx/tabid-21/39_read-311/usetemplate-2_column_pano/',
		
	};
	
	// Register the extension
	ScratchExtensions.register('FischerTechnik ROBO-LT', descriptor, ext);
	
	// start the update loop: periodically fetch sensor values from the device
	setInterval(ext.doUpdate, 55);
	
	// ensure the ROBO LT is reset
	ext.reset();
	
})({});

