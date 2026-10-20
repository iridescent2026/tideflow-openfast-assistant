import {initializeRecords} from './ocean-records.mjs?v=1.3.0';
import {initializeReports} from './ocean-reports.mjs?v=1.3.0';
import {workspaceState} from './app.mjs?v=1.1.0';
// The approved deep-sea analysis owns #page-analysis. Preserve the newer records
// and report studio without wrapping or replacing that analysis DOM a second time.
const views=[initializeRecords(),initializeReports()];
function update(){const state=workspaceState();views.forEach(view=>view.update(state));}
window.addEventListener('tideflow:render',update);update();
