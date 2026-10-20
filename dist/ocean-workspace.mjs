import {initializeAnalysis} from './ocean-analysis.mjs?v=1.3.0';
import {initializeRecords} from './ocean-records.mjs?v=1.3.0';
import {initializeReports} from './ocean-reports.mjs?v=1.3.0';
import {workspaceState} from './app.mjs?v=1.1.0';
const views=[initializeAnalysis(),initializeRecords(),initializeReports()];
function update(){const state=workspaceState();views.forEach(view=>view.update(state));}
window.addEventListener('tideflow:render',update);update();
