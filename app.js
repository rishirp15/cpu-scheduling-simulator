$(document).ready(
    function(){
        $(".form-group-time-quantum").hide();
        $(".form-group-io-requests").hide();

        var processList = [];
        var ioRequests = [];
        var queue = []; 

        // Show/hide time quantum and I/O request fields based on algorithm selection
        $('#algorithmSelector').on('change', function(){
            if(this.value === 'optRR') {
                $(".form-group-time-quantum").show(1000);
                $(".form-group-io-requests").hide(1000);
            } else if(this.value === 'optIO') {
                $(".form-group-time-quantum").hide(1000);
                $(".form-group-io-requests").show(1000);
            } else {
                $(".form-group-time-quantum").hide(1000);
                $(".form-group-io-requests").hide(1000);
            }
        });

        // Add I/O request
        $('#btnAddIO').on('click', function(){
            var ioRequestHtml = `
                <div class="row mb-2 align-items-center io-request-item">
                    <div class="col-12 mb-2">
                        <div class="input-group">
                            <div class="input-group-prepend">
                                <span class="input-group-text">Arrival Time</span>
                            </div>
                            <input type="number" class="form-control io-at" placeholder="AT" min="0" required>
                        </div>
                    </div>
                    
                    <div class="col-12 mb-2">
                        <div class="input-group">
                            <div class="input-group-prepend">
                                <span class="input-group-text">Burst Time</span>
                            </div>
                            <input type="number" class="form-control io-bt" placeholder="BT" min="0" required>
                        </div>
                    </div>
                    
                    <div class="col-12 text-right">
                        <button class="btn btn-danger btn-sm remove-io">
                            <i class="fas fa-times"></i> Remove I/O Request
                        </button>
                    </div>
                </div>
                <hr class="my-2">
            `;
            $('#ioRequestsContainer').append(ioRequestHtml);
        });
        
        // Remove I/O request
        $(document).on('click', '.remove-io', function(){
            $(this).closest('.io-request-item').next('hr').remove();
            $(this).closest('.io-request-item').remove();
        });

        $('#btnAddProcess').on('click', function(){
            var processID = $('#processID');
            var arrivalTime = $('#arrivalTime');
            var burstTime = $('#burstTime');

            if(processID.val() === '' || arrivalTime.val() === '' || burstTime.val() === ''){
                processID.addClass('is-invalid');
                arrivalTime.addClass('is-invalid');
                burstTime.addClass('is-invalid');
                return;
            }

            var process = {
                processID: parseInt(processID.val(), 10),
                arrivalTime: parseInt(arrivalTime.val(), 10),
                burstTime: parseInt(burstTime.val(), 10)
            }

            processList.push(process);
            
            $('#tblProcessList > tbody:last-child').append(
                `<tr>
                    <td>${processID.val()}</td>
                    <td>${arrivalTime.val()}</td>
                    <td>${burstTime.val()}</td>
                </tr>`
            );

            processID.val('');
            arrivalTime.val('');
            burstTime.val('');
        });

        $('#btnCalculate').on('click', function(){
            if (processList.length == 0) {
                alert('Please insert some processes');
                return;
            }

            var selectedAlgo = $('#algorithmSelector').children('option:selected').val();
            console.log('Selected Algorithm:', selectedAlgo);

            // Collect I/O requests if I/O scheduling is selected - Updated to match new structure
            if (selectedAlgo === 'optIO') {
                ioRequests = [];
                $('#ioRequestsContainer .row').each(function(){
                    var inputs = $(this).find('input');
                    var requestTime = parseInt($(inputs[0]).val());
                    var burstTime = parseInt($(inputs[1]).val());
                    if (!isNaN(requestTime) && !isNaN(burstTime)) {
                        ioRequests.push({
                            time: requestTime,
                            burst: burstTime,
                            is_served: false
                        });
                    }
                });
                console.log('I/O Requests:', ioRequests);
            }

            // Clear previous results
            $('#tblResults tbody').empty();

            try {
                if (selectedAlgo === 'optFCFS') {
                    firstComeFirstServed();
                } else if (selectedAlgo === 'optSJF') {
                    shortestJobFirst();
                } else if (selectedAlgo === 'optSRTF') {
                    shortestRemainingTimeFirst();
                } else if (selectedAlgo === 'optRR') {
                    roundRobin();
                } else if (selectedAlgo === 'optIO') {
                    ioRequestScheduling();
                }
            } catch (error) {
                console.error('Error in scheduling algorithm:', error);
                alert('An error occurred while calculating the schedule. Please check the console for details.');
            }
        });

        function firstComeFirstServed(){
            var time = 0;
            var queue = [];
            var completedList = [];
            var executionSteps = [];
            var ganttChartData = [];

            executionSteps.push('Starting First Come First Served Scheduling...');

            while (processList.length > 0 || queue.length > 0) {
                // First check for new arrivals at current time
                addToQueueFCFS(time);
                
                // If queue is empty, increment time and continue
                if (queue.length == 0) {
                    executionSteps.push(`[Time ${time}]: CPU is idle - No processes in queue`);
                    time++;
                    continue;
                }

                // Dequeue from queue and run the process
                process = queue.shift();
                executionSteps.push(`[Time ${time}]: CPU is executing P${process.processID} (Remaining Time: ${process.burstTime})`);
                
                // Add to Gantt chart
                ganttChartData.push({
                    processID: process.processID,
                    startTime: time,
                    endTime: time + process.burstTime,
                    isIO: false
                });

                // Execute the process one unit at a time
                for(var i = 0; i < process.burstTime; i++){
                    time++;
                    executionSteps.push(`[Time ${time}]: CPU is executing P${process.processID} (Remaining Time: ${process.burstTime - i - 1})`);
                    addToQueueFCFS(time);
                }   
                process.completedTime = time;
                process.turnAroundTime = process.completedTime - process.arrivalTime;
                process.waitingTime = process.turnAroundTime - process.burstTime;
                completedList.push(process);
                executionSteps.push(`[Time ${time}]: Process P${process.processID} Completed Execution`);
            }

            function addToQueueFCFS(time) {
                for(var i = 0; i < processList.length; i++) {
                    if(time >= processList[i].arrivalTime) {
                        var process = {
                            processID: processList[i].processID, 
                            arrivalTime: processList[i].arrivalTime, 
                            burstTime: processList[i].burstTime
                        }
                        processList.splice(i, 1);
                        queue.push(process);
                        executionSteps.push(`[Time ${time}]: Process P${process.processID} added to queue`);
                    }
                }
            }

            // Display results
            displayResults(completedList);
            displayExecutionSteps(executionSteps);
            displayGanttChart(ganttChartData);
        }

        function shortestJobFirst() {
            var completedList = [];
            var time = 0;
            var queue = [];
            var executionSteps = [];
            var ganttChartData = [];
            
            // Create a copy of the process list to avoid modifying the original
            var remainingProcesses = processList.map(p => ({
                processID: p.processID,
                arrivalTime: p.arrivalTime,
                burstTime: p.burstTime,
                remainingTime: p.burstTime
            }));
        
            executionSteps.push('Starting Shortest Job First Scheduling...');
        
            while (remainingProcesses.length > 0 || queue.length > 0) {
                // Add arriving processes to queue
                for (var i = 0; i < remainingProcesses.length; i++) {
                    if (remainingProcesses[i].arrivalTime <= time) {
                        queue.push(remainingProcesses[i]);
                        executionSteps.push(`[Time ${time}]: Process P${remainingProcesses[i].processID} added to queue`);
                        remainingProcesses.splice(i, 1);
                        i--; // Adjust index after removal
                    }
                }
        
                if (queue.length === 0) {
                    // No processes ready, increment time
                    executionSteps.push(`[Time ${time}]: CPU is idle - No processes in queue`);
                    time++;
                    continue;
                }
        
                // Sort queue by burst time (shortest first)
                queue.sort((a, b) => a.burstTime - b.burstTime);
        
                // Get the shortest job
                var currentProcess = queue.shift();
                
                executionSteps.push(`[Time ${time}]: CPU is executing P${currentProcess.processID} (Burst Time: ${currentProcess.burstTime})`);
                
                // Add to Gantt chart
                ganttChartData.push({
                    processID: currentProcess.processID,
                    startTime: time,
                    endTime: time + currentProcess.burstTime,
                    isIO: false
                });
        
                // Execute the entire process (non-preemptive)
                time += currentProcess.burstTime;
                
                // Calculate metrics
                currentProcess.completedTime = time;
                currentProcess.turnAroundTime = currentProcess.completedTime - currentProcess.arrivalTime;
                currentProcess.waitingTime = currentProcess.turnAroundTime - currentProcess.burstTime;
                completedList.push(currentProcess);
                
                executionSteps.push(`[Time ${time}]: Process P${currentProcess.processID} Completed Execution`);
            }
        
            // Display results
            displayResults(completedList);
            displayExecutionSteps(executionSteps);
            displayGanttChart(ganttChartData);
        }

        function shortestRemainingTimeFirst() {
            var completedList = [];
            var time = 0;
            var queue = [];
            var executionSteps = [];
            var ganttChartData = [];
            
            executionSteps.push('Starting Shortest Remaining Time First Scheduling...');

            while (processList.length>0 || queue.length>0) {
                addToQueueSRTF(time);
                while (queue.length==0) {                
                    time++;
                    addToQueueSRTF(time);
                }
             selectProcessForSRTF();
             runSRTF();
            }

            function selectProcessForSRTF() {
                if (queue.length!=0) {
                    queue.sort(function(a, b){
                        if (a.remaining > b.remaining) {
                            return 1;
                        } else {
                            return -1;
                        }
                    });
                }
            }

            function runSRTF() {
                var process = queue.shift();
                if (process.remaining === undefined) {
                    process.remaining = process.burstTime;
                }
                process.remaining--;
                
                executionSteps.push(`[Time ${time}]: CPU is executing P${process.processID} (Remaining Time: ${process.remaining})`);
                
                // Add to Gantt chart
                if (ganttChartData.length === 0 || ganttChartData[ganttChartData.length - 1].processID !== process.processID) {
                    ganttChartData.push({
                        processID: process.processID,
                        startTime: time,
                        endTime: time + 1,
                        isIO: false
                    });
                } else {
                    ganttChartData[ganttChartData.length - 1].endTime = time + 1;
                }

                if (process.remaining === 0) {
                    process.completedTime = time + 1;
                    process.turnAroundTime = process.completedTime - process.arrivalTime;
                    process.waitingTime = process.turnAroundTime - process.burstTime;
                    completedList.push(process);
                    executionSteps.push(`[Time ${time + 1}]: Process P${process.processID} Completed Execution`);
                } else {
                    queue.push(process);
                }
                time++;
            }

            function addToQueueSRTF(time) {
                for(var i = 0; i < processList.length; i++) {
                    if(processList[i].arrivalTime === time) {
                        var process = {
                            processID: processList[i].processID, 
                            arrivalTime: processList[i].arrivalTime, 
                            burstTime: processList[i].burstTime
                        }
                        processList.splice(i, 1);
                        queue.push(process);
                        executionSteps.push(`[Time ${time}]: Process P${process.processID} added to queue`);
                    }
                }
            }

            // Display results
            displayResults(completedList);
            displayExecutionSteps(executionSteps);
            displayGanttChart(ganttChartData);
        }

        function roundRobin() {
            var time = 0;
            var completed = 0;
            var completedList = [];
            var executionSteps = [];
            var ganttChartData = [];
            var timeQuantum = parseInt($('#timeQuantum').val());

            executionSteps.push('Starting Round Robin Scheduling with Time Quantum: ' + timeQuantum);

            // Initialize processes with remaining time
            var processes = processList.map(p => ({
                processID: p.processID,
                arrivalTime: p.arrivalTime,
                burstTime: p.burstTime,
                remainingTime: p.burstTime,
                completedTime: 0,
                turnAroundTime: 0,
                waitingTime: 0
            }));

            // Initialize queue
            var queue = [];
            var inQueue = new Array(processes.length).fill(false);

            while (completed < processes.length) {
                // Check for new arrivals at current time
                for (var i = 0; i < processes.length; i++) {
                    if (processes[i].arrivalTime === time && !inQueue[i] && processes[i].remainingTime > 0) {
                        queue.push(i);
                        inQueue[i] = true;
                        executionSteps.push(`[Time ${time}]: Process P${processes[i].processID} added to queue`);
                    }
                }

                if (queue.length === 0) {
                    // CPU is idle
                    executionSteps.push(`[Time ${time}]: CPU is idle - No processes in queue`);
                    time++;
                    continue;
                }

                // Get next process from queue
                var idx = queue.shift();
                inQueue[idx] = false;
                var process = processes[idx];

                executionSteps.push(`[Time ${time}]: CPU is executing P${process.processID} (Remaining Time: ${process.remainingTime})`);

                // Add to Gantt chart
                ganttChartData.push({
                    processID: process.processID,
                    startTime: time,
                    endTime: time + Math.min(process.remainingTime, timeQuantum),
                    isIO: false
                });

                if (process.remainingTime > timeQuantum) {
                    // Process needs more time
                    for (var t = 0; t < timeQuantum; t++) {
                            time++;
                        process.remainingTime--;
                        
                        // Check for new arrivals during execution
                        for (var i = 0; i < processes.length; i++) {
                            if (processes[i].arrivalTime === time && !inQueue[i] && processes[i].remainingTime > 0) {
                                queue.push(i);
                                inQueue[i] = true;
                                executionSteps.push(`[Time ${time}]: Process P${processes[i].processID} added to queue`);
                            }
                        }
                    }

                    // Add process back to queue
                    queue.push(idx);
                    inQueue[idx] = true;
                    executionSteps.push(`[Time ${time}]: Process P${process.processID} preempted and moved to end of queue`);
                } else {
                    // Process completes
                    for (var t = 0; t < process.remainingTime; t++) {
                            time++;
                        
                        // Check for new arrivals during execution
                        for (var i = 0; i < processes.length; i++) {
                            if (processes[i].arrivalTime === time && !inQueue[i] && processes[i].remainingTime > 0) {
                                queue.push(i);
                                inQueue[i] = true;
                                executionSteps.push(`[Time ${time}]: Process P${processes[i].processID} added to queue`);
                            }
                        }
                    }
                    process.remainingTime = 0;
                    completed++;
                    process.completedTime = time;
                    process.turnAroundTime = process.completedTime - process.arrivalTime;
                    process.waitingTime = process.turnAroundTime - process.burstTime;
                    completedList.push(process);
                    executionSteps.push(`[Time ${time}]: Process P${process.processID} Completed Execution`);
                }
            }

            // Display results
            displayResults(completedList);
            displayExecutionSteps(executionSteps);
            displayGanttChart(ganttChartData);
        }

        function ioRequestScheduling() {
            var time = 0;
            var completedList = [];
            var blockedProcesses = [];
            var localProcessList = [...processList];
            var localQueue = [];
            var ioQueue = [];
            var executionSteps = [];
            var ganttChartData = [];

            console.log('Starting I/O Scheduling with processes:', localProcessList);
            executionSteps.push('Starting CPU and I/O Scheduling...');

            // Initialize processes with I/O related fields
            localProcessList.forEach(process => {
                process.remaining = process.burstTime;
                process.is_blocked = false;
                process.blocked_until = -1;
            });

            while (localProcessList.length > 0 || localQueue.length > 0 || blockedProcesses.length > 0 || ioQueue.length > 0) {
                console.log(`Time ${time}: Queue length: ${localQueue.length}, Blocked processes: ${blockedProcesses.length}, I/O Queue: ${ioQueue.length}`);

                // Check for completed I/O operations (FCFS for I/O)
                blockedProcesses = blockedProcesses.filter(process => {
                    if (process.blocked_until === time) {
                        process.is_blocked = false;
                        localQueue.push(process);
                        executionSteps.push(`[Time ${time}]: Process P${process.processID} completed I/O and moved to Ready Queue`);
                        return false;
                    }
                    return true;
                });

                // Check for new I/O requests (FCFS for I/O)
                ioRequests.forEach(io => {
                    if (!io.is_served && io.time === time) {
                        var runningProcess = getNextProcessForIO(time, localQueue);
                        if (runningProcess !== -1) {
                            runningProcess.is_blocked = true;
                            runningProcess.blocked_until = time + io.burst;
                            blockedProcesses.push(runningProcess);
                            io.is_served = true;
                            executionSteps.push(`[Time ${time}]: Process P${runningProcess.processID} requested I/O (Blocked for ${io.burst} sec)`);
                        } else {
                            ioQueue.push(io);
                        }
                    }
                });

                // Add arriving processes to queue
                addToQueue(time, localProcessList, localQueue);

                // Get next process to run (SRTN)
                var currentProcess = getNextProcessForSRTN(time, localQueue);
                if (currentProcess !== -1) {
                    currentProcess.remaining--;
                    executionSteps.push(`[Time ${time}]: CPU is executing P${currentProcess.processID} (Remaining Time: ${currentProcess.remaining})`);
                    
                    // Add to Gantt chart data
                    if (ganttChartData.length === 0 || ganttChartData[ganttChartData.length - 1].processID !== currentProcess.processID) {
                        ganttChartData.push({
                            processID: currentProcess.processID,
                            startTime: time,
                            endTime: time + 1,
                            isIO: false
                        });
                    } else {
                        ganttChartData[ganttChartData.length - 1].endTime = time + 1;
                    }

                    if (currentProcess.remaining === 0) {
                        currentProcess.completedTime = time + 1;
                        currentProcess.turnAroundTime = currentProcess.completedTime - currentProcess.arrivalTime;
                        currentProcess.waitingTime = currentProcess.turnAroundTime - currentProcess.burstTime;
                        completedList.push(currentProcess);
                        executionSteps.push(`[Time ${time + 1}]: Process P${currentProcess.processID} Completed Execution`);
                    } else {
                        localQueue.push(currentProcess);
                    }
                } else {
                    executionSteps.push(`[Time ${time}]: CPU is idle`);
                    // Add idle time to Gantt chart
                    if (ganttChartData.length === 0 || ganttChartData[ganttChartData.length - 1].processID !== 'idle') {
                        ganttChartData.push({
                            processID: 'idle',
                            startTime: time,
                            endTime: time + 1,
                            isIO: false
                        });
                    } else {
                        ganttChartData[ganttChartData.length - 1].endTime = time + 1;
                    }
                }
                time++;
            }

            // Display results
            displayResults(completedList);
            displayExecutionSteps(executionSteps);
            displayGanttChart(ganttChartData);
        }

        function getNextProcessForSRTN(time, queue) {
            var minIndex = -1;
            var minRemaining = Infinity;

            for (var i = 0; i < queue.length; i++) {
                if (queue[i].arrivalTime <= time && queue[i].remaining > 0 && !queue[i].is_blocked) {
                    if (queue[i].remaining < minRemaining) {
                        minRemaining = queue[i].remaining;
                        minIndex = i;
                    }
                }
            }

            if (minIndex !== -1) {
                return queue.splice(minIndex, 1)[0];
            }
            return -1;
        }

        function getNextProcessForIO(time, queue) {
            // FCFS for I/O requests
            for (var i = 0; i < queue.length; i++) {
                if (queue[i].arrivalTime <= time && queue[i].remaining > 0 && !queue[i].is_blocked) {
                    return queue.splice(i, 1)[0];
                }
            }
            return -1;
        }

        function addToQueue(time, processList, queue) {
            for (var i = 0; i < processList.length; i++) {
                if (processList[i].arrivalTime === time) {
                    var process = {
                        processID: processList[i].processID,
                        arrivalTime: processList[i].arrivalTime,
                        burstTime: processList[i].burstTime,
                        remaining: processList[i].burstTime,
                        is_blocked: false,
                        blocked_until: -1
                    };
                    processList.splice(i, 1);
                    queue.push(process);
                    console.log(`[Time ${time}]: Process P${process.processID} added to queue`);
                }
            }
        }

        function displayResults(completedList) {
            // Clear previous results
            $('#tblResults tbody').empty();

            // Sort completedList by process ID
            completedList.sort((a, b) => a.processID - b.processID);

            // Display results
            $.each(completedList, function(key, process){
                $('#tblResults > tbody:last-child').append(
                    `<tr>
                        <td>${process.processID}</td>
                        <td>${process.arrivalTime}</td>
                        <td>${process.burstTime}</td>
                        <td>${process.completedTime}</td>
                        <td>${process.waitingTime}</td>
                        <td>${process.turnAroundTime}</td>
                    </tr>`
                );
            });
                
            // Calculate and display averages
            var avgTurnaroundTime = 0;
            var avgWaitingTime = 0;
            var maxCompletedTime = 0;

            $.each(completedList, function(key, process){
                if (process.completedTime > maxCompletedTime) {
                    maxCompletedTime = process.completedTime;
                }
                avgTurnaroundTime += process.turnAroundTime;
                avgWaitingTime += process.waitingTime;
            });

            $('#avgTurnaroundTime').val(avgTurnaroundTime / completedList.length);
            $('#avgWaitingTime').val(avgWaitingTime / completedList.length);
            $('#throughput').val(completedList.length / maxCompletedTime);
        }

        function displayExecutionSteps(steps) {
            var stepsHtml = steps.map(step => `<div>${step}</div>`).join('');
            $('#executionSteps').html(stepsHtml);
        }

        function displayGanttChart(ganttData) {
            var maxTime = Math.max(...ganttData.map(item => item.endTime));
            var chartHtml = '<div class="gantt-container" style="position: relative; height: 100px;">';
            
            // Add time scale
            chartHtml += '<div class="time-scale" style="position: absolute; top: 0; left: 0; width: 100%;">';
            for (var i = 0; i <= maxTime; i++) {
                chartHtml += `<div style="position: absolute; left: ${(i/maxTime)*100}%; border-left: 1px solid #000; height: 20px; text-align: center; width: 20px; margin-left: -10px;">${i}</div>`;
            }
            chartHtml += '</div>';

            // Add process bars
            var colors = {
                'idle': '#f8f9fa',
                '1': '#007bff',
                '2': '#28a745',
                '3': '#dc3545',
                '4': '#ffc107',
                '5': '#17a2b8'
            };

            ganttData.forEach((item, index) => {
                var left = (item.startTime/maxTime)*100;
                var width = ((item.endTime - item.startTime)/maxTime)*100;
                var color = colors[item.processID] || '#6c757d';
                var textColor = item.processID === 'idle' ? '#000' : '#fff';
                
                chartHtml += `
                    <div style="position: absolute; top: 30px; left: ${left}%; width: ${width}%; height: 40px; background-color: ${color}; border: 1px solid #000; text-align: center; line-height: 40px; color: ${textColor};">
                        ${item.processID === 'idle' ? 'IDLE' : 'P' + item.processID}
                    </div>`;
            });

            chartHtml += '</div>';
            $('#ganttChart').html(chartHtml);
        }    
    }
);