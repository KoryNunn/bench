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
        var testFunction = test.testColdStartTime ? new Function(undefined, '(' + test.test.toString() + ')()') : test.test,
            startTime = new Date(),
            endTime,
            output,
            microLoops = 0;
            
        // Because new Date() returns with a precision of 1ms,
        // run the test for at least 100ms and take an average.
        do{
            microLoops++;
            output = testFunction();
        }while(new Date() - startTime < 100)
        
        endTime = new Date();
        
        return {
            startTime: startTime,
            endTime: endTime,
            time: (endTime - startTime) / microLoops,
            output: output
        }
    }

    function runTestLoop(test){
        var loops = 0,
            startTime = new Date();
            
        //burn off a test (gets JS engines warm)
        test.test();
        
        // Loop for at least 1 second.
        do{
            loops++;
            test.results.push(runTest(test));
        }while(new Date() - startTime < 1000)
        
        test.loops = loops;
    }
    
    function resetTest(test){
        test.results = [];
    }

    function Bench(){
        this.tests = [];
    }
    Bench.prototype.constructor = Bench;
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
        fastEach(this.tests, function(){
            resetTest(this);
            runTestLoop(this);        
            calculateResults(this);
        });
        
        return this;
    };
    
    window.Bench = Bench;

})();