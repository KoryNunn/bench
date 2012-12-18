(function(undefined){

    function fastEach(items, callback) {
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (callback.call(item, item, i, items)) break;
        }
        return items;
    };
    
    function sum(items, retrieveFunction){
        var total = 0;
        fastEach(items, function(){
            total += retrieveFunction.call(this, this);
        });
        return total;
    }
    
    function average(items, retrieveFunction){
        return sum(items, retrieveFunction) / items.length;
    }
    
    function distance(a, b){
        var max = Math.max(a, b),
            min = Math.min(a, b);
                
        return max - min;
    }
    
    function calculateResults(test){
    
        var nonOutliers = [],
            totalTimeOfAcceptedResults = 0;
        
        test.totalAverageTestTime = average(test.results, function(result){
            return this.time;
        });
        
        fastEach(test.results, function(){
            this.variance = distance(test.totalAverageTestTime, this.time)
        });
        
        test.standardDeviation = Math.sqrt(average(test.results, function(){
            return Math.pow(this.time - test.totalAverageTestTime, 2);
        }));
              
        fastEach(test.results, function(){
            if(this.variance < test.standardDeviation && this.variance > -test.standardDeviation){
                this.outlier = false;
                nonOutliers.push(this);
                return;
            }
            this.outlier = true;
        });
        
        fastEach(nonOutliers, function(){
            totalTimeOfAcceptedResults += this.time;
        });
        
        test.result = totalTimeOfAcceptedResults / nonOutliers.length;
    }
    
    function runTest(test){
        //burn off a test (gets JS engines warm)
        test.test();
        
        var startTime = new Date(),
            endTime,
            output,
            microLoops = 0;
            
        // If the test runs in less than 1ms, run it a few more times to get a better 'real' time.
        do{
            microLoops++;
            if(test.testColdStartTime){
                output = (new Function(undefined, '(' + test.test.toString() + ')()'))();
            }else{
                output = test.test();            
            }
        }while(new Date() - startTime < 1)
        
        endTime = new Date();
        
        return {
            startTime: startTime,
            endTime: endTime,
            time: (endTime - startTime) / microLoops,
            output: output
        }
    }

    function runTestLoop(test){
        test.results[0] = runTest(test);
        
        var loops = 1000 / (test.results[0].time || 1),
            i = 0;
        
        while(i++ < loops){
            test.results.push(runTest(test));
        }
        test.loops = loops;
    }

    function Bench(){}
    Bench.prototype.constructor = Bench;
    Bench.prototype.tests = [];
    Bench.prototype.addTest = function(test, name){
        this.tests.push({
            name: name,
            test: test,
            results: []
        });
        this.tests.push({
            name: name + ' - cold start',
            test: test,
            results: [],
            testColdStartTime: true
        });
    };
    Bench.prototype.run = function(){
        var results = [];
        
        fastEach(this.tests, function(){
            runTestLoop(this);        
            calculateResults(this);
            console.log(this.name, this);
            console.log("RESULT: " + this.result);
            console.log('----------------------------');
        });
    };
    
    window.Bench = Bench;

})();