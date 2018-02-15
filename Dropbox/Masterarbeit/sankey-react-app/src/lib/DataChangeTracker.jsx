import {extendObservable} from "mobx";

class DataChangeTracker {
    constructor() {
        extendObservable(this, {
            dataParsed: false,
            numberOfPatients: 0,
            numberOfSamples: 0,
            numberOfTimepoints: 0,

            sankeyCounts: {},
            sankeyCategories: [],
            currentSankeyData: {},

            clinicalEvents: {},
            currentEvents: [],
            sampleEvents: [],
        });
    }

    setSankeyData(data) {
        this.currentSankeyData = data;
    }

    setNumPatients(number) {
        this.numberOfPatients = number;
    }

    setNumSamples(number) {
        this.numberOfSamples = number;
    }

    setNumTimepoints(number) {
        this.numberOfTimepoints = number;
    }


    setSankeyCategories(categories) {
        this.sankeyCategories = categories;
    }

    setCounts(counts) {
        this.sankeyCounts = counts;
    }

    setParsed(parsed) {
        this.dataParsed = parsed;
    }

    setHistData(histData) {
        this.histData = histData;
    }

    setClinicalEvents(events) {
        this.clinicalEvents = events;
    }

    addEvents(type, events, color) {
        let oldEvents=this.currentEvents.slice();
        oldEvents.push({"type": type, "events": events, "color": color});
        this.currentEvents=oldEvents;
    }

    removeEvents(type) {
        let currentEvents=[];
        this.currentEvents.forEach(function (d) {
            if(d.type!==type){
                currentEvents.push(d);
            }
        });
        this.currentEvents=currentEvents;
    }

    setSampleEvents(events) {
        this.sampleEvents = events;
    }
}
export default DataChangeTracker;