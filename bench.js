//Copyright (C) 2012 Kory Nunn

//Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

//The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

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
            if(retrieveFunction){
                total += retrieveFunction.call(this, this);
            }else{
                total += this;
            }
        });
        return total;
    }
    
    function average(items, retrieveFunction){
        return sum(items, retrieveFunction) / items.length;
    }
    
    function calculateResults(test){
        var bench = this,
            inliers = [],
            totalTimeOfAcceptedResults = 0;
        
        test.totalAverageTestTime = average(test.results, function(result){
            return this.time;
        });
        
        fastEach(test.results, function(){
            this.variance = Math.pow(test.totalAverageTestTime - this.time, 2)
        });
        
        test.standardDeviation = Math.sqrt(
            sum(test.results, function(){
                return this.variance;
            })
            /
            (test.results.length - 1) /* I still dont trust this minus 1 stuff... */ 
        );
              
        fastEach(test.results, function(){
            this.zScore = (this.time - test.totalAverageTestTime) / test.standardDeviation;
            
            
            
            if(Math.abs(this.zScore) < bench.tolerableDeviations){
                this.outlier = false;
                inliers.push(this);
                return;
            }
            this.outlier = true;
        });
        
        fastEach(inliers, function(){
            totalTimeOfAcceptedResults += this.time;
        });
        
        test.numberOfOutliers = test.results.length - inliers.length;
        test.numberOfInliers = inliers.length;
        
        test.result = average(inliers, function(){
            return this.time;
        });
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
    Bench.prototype.tolerableDeviations = 2; // Default to 95th percentile.
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
        var bench = this;
        fastEach(this.tests, function(){
            resetTest(this);
            runTestLoop(this);        
            calculateResults.call(bench, this);
        });
        
        return this;
    };
    
    window.Bench = Bench;

})();