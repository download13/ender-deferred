function(context) {
	function Deferred(general_error_handler) {
		this.success_callbacks = [];
		this.fail_callbacks = [];
		this.fired = false;
		this.results = null;
		this.firing = false;
		this.cancelled = false;
	}
	Deferred.prototype = {
		resolve: function() {
			return this._return(this.success_callbacks, 'success', slice.call(arguments, 0));
		},
		reject: function() {
			return this._return(this.fail_callbacks, 'fail', slice.call(arguments, 0));
		},
		_return: function(callbacks, state, args) {
			if(!this.cancelled && !this.fired) {
				try {
					while(callbacks.length > 0) {
						callbacks.shift().apply(this, args);
					}
				} finally {
					this.fired = state;
					this.results = args;
				}
			}
			return this;
		},
		done: function() {
			return this._addcallback('success_callbacks', 'success', slice.call(arguments, 0));
		},
		fail: function() {
			return this._addcallback('fail_callbacks', 'fail', slice.call(arguments, 0));
		},
		then: function(s, f) {
			if(!this.cancelled) {
				this.done(s);
				this.fail(f);
			}
			return this;
		},
		_addcallback: function(callbacks, state, args) {
			if(!this.cancelled) {
				this[callbacks] = this[callbacks].concat(args); // Add all args to the callbacks array
				
				if(this.fired == state) { // If it has already fired this state
					this.fired = false; // Reset
					this._return(this[callbacks], state, this.results); // And simulate firing again
				}
			}
			return this;
		},
		isResolved: function() {
			return this.fired == 'success';
		},
		isRejected: function() {
			return this.fired == 'fail';
		},
		cancel: function() {
			this.cancelled = true;
			this.success_callbacks = [];
			this.fail_callbacks = [];
			return this;
		}
	}
	function when(f) {
		var args = slice.call(arguments, 0);
		
		if(args.length < 2 && f.resolve) { // Just one deferred, don't bother making another, just return it
			return f;
		}
		
		var dfd = new Deferred();
		if(args.length < 2) { // Just one static item
			if(Array.isArray(f)) { // If it's an array
				args = f; // We assume it's an array of promises
			} else {
				dfd.resolve(f); // resolve the deferred and send it the static item
			}
		}
		if(args.length > 1 || Array.isArray(f)) { // Multiple items
			var remain = args.length;
			for(var i = 0; i < args.length; i++) {
				var item = args[i];
				if(item != null && item.resolve) { // If item is a deferred
					item.then(oneresolved(i), dfd.reject); // Give it a handler
				} else { // If item is a static result
					remain--; // Just decrement the remaining items counter
				}
			}
		}
		
		function oneresolved(i) {
			return function(v) {
				args[i] = arguments.length > 1 ? slice.call(arguments, 0) : v; // Change the completed deferreds into their returned values
				if((--remain) == 0) { // If it's the last item
					dfd.resolve.apply(dfd, args); // Then tell the `when` Deferred
				}
			}
		}
		
		return dfd;
	}
	context.Deferred = function() {
		return new Deferred();
	}
	context.when = when;
}(this);