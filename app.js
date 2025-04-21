$(document).ready(function(){
    var processList = [];
    var ioRequests = [];
    var queue = [];

    // Initially hide conditional fields
    $("#timeQuantumGroup, #ioRequestGroup").hide().addClass('hidden');

    // Show/hide conditional fields with animation
    $('#algorithm').on('change', function(){
        $("#timeQuantumGroup, #ioRequestGroup").slideUp(300).addClass('hidden');
        if (this.value === 'RR') {
            $("#timeQuantumGroup").slideDown(300).removeClass('hidden');
        } else if (this.value === 'IO') {
            $("#ioRequestGroup").slideDown(300).removeClass('hidden');
        }
    });

    // Real-time input validation
    $('#arrivalTime, #burstTime').on('input', function() {
        var input = $(this).val().trim().split(' ').map(Number);
        if (input.length > 0 && !input.some(isNaN) && input.every(n => n >= 0)) {
            $(this).addClass('is-valid').removeClass('is-invalid');
        } else {
            $(this).addClass('is-invalid').removeClass('is-valid');
        }
    });

    $('#timeQuantum').on('input', function() {
        var value = parseInt($(this).val());
        if (!isNaN(value) && value > 0) {
            $(this).addClass('is-valid').removeClass('is-invalid');
        } else {
            $(this).addClass('is-invalid').removeClass('is-valid');
        }
    });

    $('#ioArrivalTime, #ioBurstTime').on('input', function() {
        var input = $(this).val().trim().split(' ').map(Number);
        if (input.length === 0 || (!input.some(isNaN) && input.every(n => n >= 0))) {
            $(this).addClass('is-valid').removeClass('is-invalid');
        } else {
            $(this).addClass('is-invalid').removeClass('is-valid');
        }
    });

    // Sample input
    $('#sampleInput').on('click', function() {
        $('#arrivalTime').val('0 1 2').addClass('is-valid').removeClass('is-invalid');
        $('#burstTime').val('5 3 4').addClass('is-valid').removeClass('is-invalid');
        $('#algorithm').val('FCFS');
        $("#timeQuantumGroup, #ioRequestGroup").slideUp(300).addClass('hidden');
    });

    // Clear form
    $('#clearForm').on('click', function() {
        $('#schedulingForm')[0].reset();
        $('#arrivalTime, #burstTime, #timeQuantum, #ioArrivalTime, #ioBurstTime').removeClass('is-valid is-invalid');
        $('#tblProcessList tbody, #tblResults tbody, #executionSteps, #ganttChart').empty();
        $('#avgTurnaroundTime, #avgWaitingTime, #throughput').val('');
        $("#timeQuantumGroup, #ioRequestGroup").slideUp(300).addClass('hidden');
    });

    $('#schedulingForm').on('submit', function(e){
        e.preventDefault();
        
        // Show loading overlay
        $('.loading-overlay').fadeIn(200);
        
        // Clear previous invalid states
        $('#arrivalTime, #burstTime, #timeQuantum, #ioArrivalTime, #ioBurstTime').removeClass('is-invalid is-valid');
        
        // Get input values
        var arrivalTimes = $('#arrivalTime').val().trim().split(' ').map(Number);
        var burstTimes = $('#burstTime').val().trim().split(' ').map(Number);
        var selectedAlgo = $('#algorithm').val();
        var timeQuantum = parseInt($('#timeQuantum').val());
        var ioArrivalTimes = $('#ioArrivalTime').val().trim().split(' ').map(Number).filter(n => !isNaN(n));
        var ioBurstTimes = $('#ioBurstTime').val().trim().split(' ').map(Number).filter(n => !isNaN(n));

        // Validate inputs
        if (arrivalTimes.length === 0 || burstTimes.length === 0 || arrivalTimes.length !== burstTimes.length || 
            arrivalTimes.some(isNaN) || burstTimes.some(isNaN) || arrivalTimes.some(n => n < 0) || burstTimes.some(n => n <= 0)) {
            $('#arrivalTime, #burstTime').addClass('is-invalid');
            $('.loading-overlay').fadeOut(200);
            showToast('Error: Arrival and Burst times must have same length, contain valid non-negative numbers, and burst times must be positive', 'danger');
            return;
        }

        if (selectedAlgo === 'RR' && (isNaN(timeQuantum) || timeQuantum <= 0)) {
            $('#timeQuantum').addClass('is-invalid');
            $('.loading-overlay').fadeOut(200);
            showToast('Error: Please enter a valid time quantum', 'danger');
            return;
        }

        if (selectedAlgo === 'IO' && ioArrivalTimes.length !== ioBurstTimes.length) {
            $('#ioArrivalTime, #ioBurstTime').addClass('is-invalid');
            $('.loading-overlay').fadeOut(200);
            showToast('Error: I/O Arrival and Burst times must have same length', 'danger');
            return;
        }

        // Create process list
        processList = [];
        for (var i = 0; i < arrivalTimes.length; i++) {
            processList.push({
                processID: i + 1,
                arrivalTime: arrivalTimes[i],
                burstTime: burstTimes[i]
            });
        }

        // Update process table
        $('#tblProcessList tbody').empty();
        processList.forEach(process => {
            $('#tblProcessList > tbody:last-child').append(
                `<tr>
                    <td>${process.processID}</td>
                    <td>${process.arrivalTime}</td>
                    <td>${process.burstTime}</td>
                </tr>`
            );
        });

        // Handle I/O requests for IO scheduling
        if (selectedAlgo === 'IO') {
            ioRequests = [];
            for (var i = 0; i < Math.min(ioArrivalTimes.length, ioBurstTimes.length); i++) {
                if (!isNaN(ioArrivalTimes[i]) && !isNaN(ioBurstTimes[i]) && ioArrivalTimes[i] >= 0 && ioBurstTimes[i] > 0) {
                    ioRequests.push({
                        time: ioArrivalTimes[i],
                        burst: ioBurstTimes[i],
                        is_served: false
                    });
                }
            }
        }

        // Clear previous results
        $('#tblResults tbody, #executionSteps, #ganttChart').empty();
        $('#exportResults').prop('disabled', true);

        try {
            if (selectedAlgo === 'FCFS') {
                firstComeFirstServed();
            } else if (selectedAlgo === 'SJF') {
                shortestJobFirst();
            } else if (selectedAlgo === 'SRTF') {
                shortestRemainingTimeFirst();
            } else if (selectedAlgo === 'RR') {
                roundRobin();
            } else if (selectedAlgo === 'IO') {
                ioRequestScheduling();
            }
            $('#exportResults').prop('disabled', false);
            showToast('Simulation completed successfully!', 'success');
        } catch (error) {
            console.error('Error in scheduling algorithm:', error);
            showToast('Error: An error occurred while calculating the schedule. Check the console.', 'danger');
        } finally {
            $('.loading-overlay').fadeOut(200);
        }
    });

    // Toast notification function
    function showToast(message, type) {
        var toast = $('.toast');
        toast.removeClass('bg-success bg-danger').addClass(`bg-${type}`);
        toast.find('.toast-body').text(message);
        toast.toast('show');
    }

    function firstComeFirstServed() {
        var time = 0;
        var completedList = [];
        var executionSteps = [];
        var ganttChartData = [];
        var processes = JSON.parse(JSON.stringify(processList)).sort((a, b) => a.arrivalTime - b.arrivalTime);
    
        executionSteps.push('Starting First Come First Served Scheduling...');
    
        processes.forEach(process => {
            if (time < process.arrivalTime) {
                executionSteps.push(`[Time ${time}]: CPU idle until ${process.arrivalTime}`);
                ganttChartData.push({
                    processID: 'idle',
                    startTime: time,
                    endTime: process.arrivalTime,
                    isIO: false
                });
                time = process.arrivalTime;
            }
    
            executionSteps.push(`[Time ${time}]: Executing P${process.processID} (BT: ${process.burstTime})`);
            ganttChartData.push({
                processID: process.processID,
                startTime: time,
                endTime: time + process.burstTime,
                isIO: false
            });
    
            process.completedTime = time + process.burstTime;
            process.turnAroundTime = process.completedTime - process.arrivalTime;
            process.waitingTime = process.turnAroundTime - process.burstTime;
            completedList.push(process);
            
            time += process.burstTime;
        });
    
        displayResults(completedList);
        displayExecutionSteps(executionSteps);
        displayGanttChart(ganttChartData);
    }

    function shortestJobFirst() {
        var time = 0;
        var completedList = [];
        var executionSteps = [];
        var ganttChartData = [];
        var processes = JSON.parse(JSON.stringify(processList));
    
        executionSteps.push('Starting Shortest Job First Scheduling...');
    
        while (processes.length > 0) {
            var readyQueue = processes.filter(p => p.arrivalTime <= time);
            
            if (readyQueue.length === 0) {
                var nextArrival = Math.min(...processes.map(p => p.arrivalTime));
                executionSteps.push(`[Time ${time}]: CPU idle until ${nextArrival}`);
                ganttChartData.push({
                    processID: 'idle',
                    startTime: time,
                    endTime: nextArrival,
                    isIO: false
                });
                time = nextArrival;
                continue;
            }
    
            readyQueue.sort((a, b) => {
                if (a.burstTime !== b.burstTime) return a.burstTime - b.burstTime;
                return a.arrivalTime - b.arrivalTime;
            });
    
            var currentProcess = readyQueue[0];
            executionSteps.push(`[Time ${time}]: Executing P${currentProcess.processID} (BT: ${currentProcess.burstTime})`);
            
            ganttChartData.push({
                processID: currentProcess.processID,
                startTime: time,
                endTime: time + currentProcess.burstTime,
                isIO: false
            });
    
            currentProcess.completedTime = time + currentProcess.burstTime;
            currentProcess.turnAroundTime = currentProcess.completedTime - currentProcess.arrivalTime;
            currentProcess.waitingTime = currentProcess.turnAroundTime - currentProcess.burstTime;
            completedList.push(currentProcess);
            
            processes = processes.filter(p => p.processID !== currentProcess.processID);
            time += currentProcess.burstTime;
        }
    
        displayResults(completedList);
        displayExecutionSteps(executionSteps);
        displayGanttChart(ganttChartData);
    }

    function shortestRemainingTimeFirst() {
        var time = 0;
        var completedList = [];
        var executionSteps = [];
        var ganttChartData = [];
        var processes = JSON.parse(JSON.stringify(processList));
        processes.forEach(p => p.remainingTime = p.burstTime);
    
        executionSteps.push('Starting Shortest Remaining Time First Scheduling...');
    
        while (processes.some(p => p.remainingTime > 0)) {
            var readyQueue = processes.filter(p => p.arrivalTime <= time && p.remainingTime > 0);
    
            if (readyQueue.length === 0) {
                var nextArrivals = processes
                    .filter(p => p.remainingTime > 0 && p.arrivalTime > time)
                    .map(p => p.arrivalTime);
                if (nextArrivals.length === 0) break;
                var nextArrival = Math.min(...nextArrivals);
                executionSteps.push(`[Time ${time}]: CPU idle until ${nextArrival}`);
                ganttChartData.push({
                    processID: 'idle',
                    startTime: time,
                    endTime: nextArrival,
                    isIO: false
                });
                time = nextArrival;
                continue;
            }
    
            readyQueue.sort((a, b) => {
                if (a.remainingTime !== b.remainingTime) return a.remainingTime - b.remainingTime;
                return a.arrivalTime - b.arrivalTime;
            });
    
            var currentProcess = readyQueue[0];
            var executionTime = 1;
            
            var nextArrivals = processes
                .filter(p => p.arrivalTime > time && p.remainingTime > 0)
                .map(p => p.arrivalTime);
            var nextArrival = nextArrivals.length > 0 ? Math.min(...nextArrivals) : Infinity;
            
            if (nextArrival < time + executionTime) {
                executionTime = nextArrival - time;
            } else {
                var nextShorterProcess = readyQueue
                    .filter(p => p.processID !== currentProcess.processID)
                    .find(p => p.remainingTime < currentProcess.remainingTime);
                if (nextShorterProcess) {
                    executionTime = Math.min(executionTime, currentProcess.remainingTime);
                }
            }
    
            executionSteps.push(`[Time ${time}]: Executing P${currentProcess.processID} for ${executionTime} unit(s) (Remaining: ${currentProcess.remainingTime})`);
            
            if (ganttChartData.length > 0 && 
                ganttChartData[ganttChartData.length-1].processID === currentProcess.processID &&
                ganttChartData[ganttChartData.length-1].endTime === time) {
                ganttChartData[ganttChartData.length-1].endTime += executionTime;
            } else {
                ganttChartData.push({
                    processID: currentProcess.processID,
                    startTime: time,
                    endTime: time + executionTime,
                    isIO: false
                });
            }
    
            currentProcess.remainingTime -= executionTime;
            time += executionTime;
    
            if (currentProcess.remainingTime <= 0) {
                currentProcess.completedTime = time;
                currentProcess.turnAroundTime = currentProcess.completedTime - currentProcess.arrivalTime;
                currentProcess.waitingTime = currentProcess.turnAroundTime - currentProcess.burstTime;
                completedList.push(currentProcess);
                executionSteps.push(`[Time ${time}]: P${currentProcess.processID} completed`);
            }
        }
    
        displayResults(completedList);
        displayExecutionSteps(executionSteps);
        displayGanttChart(ganttChartData);
    }
    
    function roundRobin() {
        var time = 0;
        var completedList = [];
        var executionSteps = [];
        var ganttChartData = [];
        var timeQuantum = parseInt($('#timeQuantum').val());
        var processes = JSON.parse(JSON.stringify(processList));
    
        executionSteps.push('Starting Round Robin Scheduling with Time Quantum: ' + timeQuantum);
    
        processes.forEach(p => p.remainingTime = p.burstTime);
        processes.sort((a, b) => a.arrivalTime - b.arrivalTime);
    
        var queue = [];
    
        while (true) {
            while (processes.length > 0 && processes[0].arrivalTime <= time) {
                var arrivingProcess = processes.shift();
                queue.push(arrivingProcess);
                executionSteps.push(`[Time ${time}]: Process P${arrivingProcess.processID} arrived and added to queue`);
            }
    
            if (queue.length === 0) {
                if (processes.length === 0) break;
                
                var nextArrival = processes[0]?.arrivalTime || time;
                var idleTime = nextArrival - time;
                
                if (idleTime > 0) {
                    ganttChartData.push({
                        processID: "idle",
                        startTime: time,
                        endTime: nextArrival,
                        isIO: false
                    });
                    executionSteps.push(`[Time ${time}]: CPU idle until ${nextArrival}`);
                    time = nextArrival;
                }
                continue;
            }
    
            var currentProcess = queue.shift();
            var executionTime = Math.min(timeQuantum, currentProcess.remainingTime);
    
            ganttChartData.push({
                processID: currentProcess.processID,
                startTime: time,
                endTime: time + executionTime,
                isIO: false
            });
    
            executionSteps.push(`[Time ${time}]: Executing P${currentProcess.processID} for ${executionTime} units (Remaining: ${currentProcess.remainingTime})`);
    
            time += executionTime;
            currentProcess.remainingTime -= executionTime;
    
            while (processes.length > 0 && processes[0].arrivalTime <= time) {
                var newProcess = processes.shift();
                queue.push(newProcess);
                executionSteps.push(`[Time ${newProcess.arrivalTime}]: Process P${newProcess.processID} arrived during execution`);
            }
    
            if (currentProcess.remainingTime === 0) {
                currentProcess.completedTime = time;
                currentProcess.turnAroundTime = currentProcess.completedTime - currentProcess.arrivalTime;
                currentProcess.waitingTime = currentProcess.turnAroundTime - currentProcess.burstTime;
                completedList.push(currentProcess);
                executionSteps.push(`[Time ${time}]: Process P${currentProcess.processID} completed`);
            } else {
                queue.push(currentProcess);
                executionSteps.push(`[Time ${time}]: Process P${currentProcess.processID} preempted and queued`);
            }
        }
    
        var mergedGanttData = [];
        if (ganttChartData.length > 0) {
            mergedGanttData.push(ganttChartData[0]);
            for (var i = 1; i < ganttChartData.length; i++) {
                var last = mergedGanttData[mergedGanttData.length - 1];
                var current = ganttChartData[i];
                
                if (last.processID === current.processID && last.endTime === current.startTime) {
                    last.endTime = current.endTime;
                } else {
                    mergedGanttData.push(current);
                }
            }
        }
    
        displayResults(completedList);
        displayExecutionSteps(executionSteps);
        displayGanttChart(mergedGanttData);
    }

    function ioRequestScheduling() {
        var time = 0;
        var completedList = [];
        var blockedProcesses = [];
        var processes = JSON.parse(JSON.stringify(processList));
        var readyQueue = [];
        var executionSteps = [];
        var ganttChartData = [];
        var localIORequests = JSON.parse(JSON.stringify(ioRequests));

        executionSteps.push('Starting CPU and I/O Scheduling...');

        processes.forEach(p => {
            p.remainingTime = p.burstTime;
            p.isBlocked = false;
            p.blockedUntil = -1;
        });

        while (processes.length > 0 || readyQueue.length > 0 || blockedProcesses.length > 0) {
            for (var i = processes.length - 1; i >= 0; i--) {
                if (processes[i].arrivalTime <= time) {
                    readyQueue.push(processes[i]);
                    executionSteps.push(`[Time ${time}]: Process P${processes[i].processID} added to ready queue`);
                    processes.splice(i, 1);
                }
            }

            for (var i = blockedProcesses.length - 1; i >= 0; i--) {
                if (blockedProcesses[i].blockedUntil <= time) {
                    blockedProcesses[i].isBlocked = false;
                    readyQueue.push(blockedProcesses[i]);
                    executionSteps.push(`[Time ${time}]: Process P${blockedProcesses[i].processID} completed I/O and moved to ready queue`);
                    blockedProcesses.splice(i, 1);
                }
            }

            for (var i = localIORequests.length - 1; i >= 0; i--) {
                if (!localIORequests[i].is_served && localIORequests[i].time === time) {
                    var processIndex = readyQueue.findIndex(p => !p.isBlocked);
                    if (processIndex !== -1) {
                        var ioProcess = readyQueue[processIndex];
                        ioProcess.isBlocked = true;
                        ioProcess.blockedUntil = time + localIORequests[i].burst;
                        blockedProcesses.push(ioProcess);
                        localIORequests[i].is_served = true;
                        readyQueue.splice(processIndex, 1);
                        executionSteps.push(`[Time ${time}]: Process P${ioProcess.processID} requested I/O (Blocked for ${localIORequests[i].burst} units)`);
                    }
                }
            }

            if (readyQueue.length === 0) {
                if (processes.length === 0 && blockedProcesses.length === 0) break;
                executionSteps.push(`[Time ${time}]: CPU is idle - No processes in ready queue`);
                ganttChartData.push({
                    processID: 'idle',
                    startTime: time,
                    endTime: time + 1,
                    isIO: false
                });
                time++;
                continue;
            }

            readyQueue.sort((a, b) => a.remainingTime - b.remainingTime);
            var currentProcess = readyQueue[0];
            executionSteps.push(`[Time ${time}]: CPU is executing P${currentProcess.processID} (Remaining Time: ${currentProcess.remainingTime})`);
            
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

            currentProcess.remainingTime--;
            time++;

            if (currentProcess.remainingTime === 0) {
                currentProcess.completedTime = time;
                currentProcess.turnAroundTime = currentProcess.completedTime - currentProcess.arrivalTime;
                currentProcess.waitingTime = currentProcess.turnAroundTime - currentProcess.burstTime;
                completedList.push(currentProcess);
                executionSteps.push(`[Time ${time}]: Process P${currentProcess.processID} Completed Execution`);
                readyQueue.shift();
            }
        }

        displayResults(completedList);
        displayExecutionSteps(executionSteps);
        displayGanttChart(ganttChartData);
    }

    function displayResults(completedList) {
        $('#tblResults tbody').empty();

        completedList.sort((a, b) => a.processID - b.processID);

        var totalTurnaround = 0;
        var totalWaiting = 0;
        var maxCompletion = 0;

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
            
            totalTurnaround += process.turnAroundTime;
            totalWaiting += process.waitingTime;
            if (process.completedTime > maxCompletion) {
                maxCompletion = process.completedTime;
            }
        });
            
        $('#avgTurnaroundTime').val((totalTurnaround / completedList.length).toFixed(2));
        $('#avgWaitingTime').val((totalWaiting / completedList.length).toFixed(2));
        $('#throughput').val((completedList.length / maxCompletion).toFixed(2));
    }

    function displayExecutionSteps(steps) {
        var stepsHtml = steps.map(step => `<div class="mb-1 small">${step}</div>`).join('');
        $('#executionSteps').html(stepsHtml);
    }

    function displayGanttChart(ganttData) {
        if (ganttData.length === 0) return;
        
        var maxTime = Math.max(...ganttData.map(item => item.endTime));
        var chartHtml = '<div class="gantt-container" style="display: flex; flex-wrap: nowrap; gap: 2px; padding: 10px; min-height: 50px;">';
        
        var colors = {
            'idle': '#6C757D',
            '1': '#4A90E2',
            '2': '#E94E77',
            '3': '#2ECC71',
            '4': '#F1C40F',
            '5': '#9B59B6',
            '6': '#1ABC9C',
            '7': '#E67E22',
            '8': '#3498DB',
            '9': '#C0392B',
            '10': '#7F8C8D'
        };

        ganttData.forEach(item => {
            var width = ((item.endTime - item.startTime) / maxTime) * 100;
            var color = colors[item.processID] || '#6C757D';
            var label = item.processID === 'idle' ? 'IDLE' : 'P' + item.processID;
            
            chartHtml += `
                <div style="flex: 0 0 ${width}%; background-color: ${color}; border-radius: 4px; text-align: center; color: #FFFFFF; font-size: 0.8rem; line-height: 30px; position: relative; min-width: 30px;">
                    ${label}
                    <span style="position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); font-size: 0.7rem; color: #AB47BC;">
                        ${item.startTime}-${item.endTime}
                    </span>
                </div>`;
        });
        
        chartHtml += '</div>';
        $('#ganttChart').html(chartHtml);
    }    
});