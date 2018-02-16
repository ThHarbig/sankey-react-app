import {extendObservable} from "mobx";
import axios from 'axios';


class ObservableParser {
    constructor() {
        this.studyID = "";
        this.patients = [];
        this.sampleStructure = {};
        this.clinicalEvents= {};
        this.countsPerTP= {};

        extendObservable(this, {
            numberOfTimepoints:0,
            numberOfSamples:0,
            numberOfPatients:0,

            parsed: false,
            countsFirstTP: [],
            countsSecondTP: [],
            clinicalCat: [],

            sampleEvents: [],
            currentEvents: [],

            currentSankeyData:{}
        });
    }



    parse(studyID) {
        this.studyID=studyID;
        /**
         * get patient information first
         */
        axios.get("http://www.cbioportal.org/api/studies/" + this.studyID + "/patients?projection=SUMMARY&pageSize=10000000&pageNumber=0&direction=ASC")
            .then(response => {
                this.patients = response.data;
                this.numberOfPatients=this.patients.length;
                let _self = this;
                let eventRequests = [];
                /**
                 * get clinical events for all the patients
                 */
                this.patients.forEach(function (patient) {
                    eventRequests.push(axios.get("http://www.cbioportal.org/api/studies/" + _self.studyID + "/patients/" + patient.patientId + "/clinical-events?projection=SUMMARY&pageSize=10000000&pageNumber=0&direction=ASC"));
                });
                axios.all(eventRequests)
                    .then(function (results) {
                        results.forEach(function (response2,i) {
                            _self.clinicalEvents[_self.patients[i].patientId] = ObservableParser.sortEvents(response2.data);
                        });
                        /**
                         * get clinical data and mutation counts
                         */
                        axios.all([_self.getClinicalData(), _self.getMutationCounts()])
                            .then(axios.spread(function (clinicalData, mutationCounts) {
                                _self.buildPatientStructure(clinicalData.data, mutationCounts.data);
                                _self.createSankeyData();
                                _self.numberOfSamples=mutationCounts.data.length;
                                _self.sampleEvents={"type":"SPECIMEN","events":_self.getEvents("SPECIMEN"),"color":"blue"};
                                _self.setCurrentSankeyData(_self.clinicalCat[0]);
                                _self.parsed=true;

                            }));
                    })
            })
    }

    /**
     * sorts clinical events for one patient
     * @param events
     * @returns sorted clinical events
     */
    static sortEvents(events) {
        events.sort(function (a, b) {
            if (a.startNumberOfDaysSinceDiagnosis > b.startNumberOfDaysSinceDiagnosis) {
                return 1;
            }
            if (a.startNumberOfDaysSinceDiagnosis < b.startNumberOfDaysSinceDiagnosis) {
                return -1;
            }
            else {
                return 0;
            }
        });
        return events;
    }

    /**
     * gets events of one type ("STATUS","SPECIMEN","TREATMENT",...)
     * @param value
     * @returns events of one type
     */
    getEvents(value) {
        let events = [];
        for (let patient in this.clinicalEvents) {
            const filtered = this.clinicalEvents[patient].filter(function (d) {
                return d.eventType === value;
            });
            events.push({"patient": patient, "events": filtered});
        }
        return events;
    }

    /**
     * add event to current events
     * @param value
     * @param color
     */
    addEvents(value, color) {
        let oldEvents=this.currentEvents.slice();
        oldEvents.push({"type": value, "events": this.getEvents(value), "color": color});
        this.currentEvents=oldEvents;
    }

    /**
     * remove event from current events
     * @param type
     */
    removeEvents(type) {
        let currentEvents=[];
        this.currentEvents.forEach(function (d) {
            if(d.type!==type){
                currentEvents.push(d);
            }
        });
        this.currentEvents=currentEvents;
    }

    /**
     * sets current sankey dataset
     * @param category
     */
    setCurrentSankeyData(category){
        this.currentSankeyData=this.countsPerTP[category];
    }

    /**
     * combines clinical events of sort "SPECIMEN" and clinical data in one datastructure,
     * creates dataset for histogram of mutation counts
     * @param clinicalData
     * @param mutationCounts
     */
    buildPatientStructure(clinicalData, mutationCounts) {
        const _self = this;
        this.patients.forEach(function (d) {
            _self.sampleStructure[d.patientId] = {"attributes": [], "timepoints": {}};
            let previousDate = -1;
            let currTP = 0;
            _self.clinicalEvents[d.patientId].forEach(function (e, i) {
                if (e.eventType === "SPECIMEN" && e.attributes.length === 2) {
                    _self.numberOfTimepoints+=1;
                    if (e.startNumberOfDaysSinceDiagnosis === 0) {
                        _self.countsFirstTP.push(ObservableParser.getSampleMutationCounts(mutationCounts, e.attributes[1].value));
                    }
                    else {
                        _self.countsSecondTP.push(ObservableParser.getSampleMutationCounts(mutationCounts, e.attributes[1].value));
                    }
                    let sampleInfo = {"clinicalData": {}, "name": e.attributes[1].value};
                    let sampleClinicalData = _self.getSampleClinicalData(clinicalData, e.attributes[1].value);
                    sampleClinicalData.forEach(function (f, i) {
                        if (_self.clinicalCat.indexOf(f.clinicalAttributeId) === -1) {
                            _self.clinicalCat.push(f.clinicalAttributeId);
                        }
                        sampleInfo.clinicalData[f.clinicalAttributeId] = f.value;
                    });
                    if (e.startNumberOfDaysSinceDiagnosis !== previousDate) {
                        _self.sampleStructure[d.patientId].timepoints[currTP]=[];
                        _self.sampleStructure[d.patientId].timepoints[currTP].push(sampleInfo);
                        currTP += 1;
                    }
                    else {
                        _self.sampleStructure[d.patientId].timepoints[currTP - 1].push(sampleInfo);
                    }
                    previousDate = e.startNumberOfDaysSinceDiagnosis;
                }
            })
        });

    }
    /**
     * creates data for sankey diagram
     */
    createSankeyData() {
        let counts = {};
        const _self = this;
        this.clinicalCat.forEach(function (category) {
            let links = [];
            let nodes = [];
            for (let patient in _self.sampleStructure) {
                let counter = 0;
                while (counter + 1 < Object.keys(_self.sampleStructure[patient].timepoints).length) {
                    const current_state = _self.sampleStructure[patient].timepoints[counter][0].clinicalData[category] + " (timepoint " + String(counter) + ")";
                    const next_state = _self.sampleStructure[patient].timepoints[counter + 1][0].clinicalData[category] + " (timepoint " + String(counter + 1) + ")";
                    if (ObservableParser.nodesIndex(current_state, nodes) === -1) {
                        nodes.push({"name": current_state});
                    }
                    if (ObservableParser.nodesIndex(next_state, nodes) === -1) {
                        nodes.push({"name": next_state});
                    }
                    let currSource = ObservableParser.nodesIndex(current_state, nodes);
                    let currTarget = ObservableParser.nodesIndex(next_state, nodes);
                    if (ObservableParser.linksIndex(currSource, currTarget, links) === -1) {
                        links.push({"source": currSource, "target": currTarget, "value": 0})
                    }
                    let currLinkIndex = ObservableParser.linksIndex(currSource, currTarget, links);
                    links[currLinkIndex].value += 1;
                    counter += 1
                }


            }
            counts[category] = {"nodes": nodes, "links": links};
        });
        this.countsPerTP = counts;
    }

    /**
     * gets node with a certain name from the nodes array
     * @param name
     * @param nodes
     * @returns index of node
     */
    static nodesIndex(name, nodes) {
        let index = -1;
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].name === name) {
                index = i;
                break;
            }
        }
        return index;
    }

    /**
     * gets ling with a certain source and target from the links array
     * @param source
     * @param target
     * @param links
     * @returns index of link
     */
    static linksIndex(source, target, links) {
        let index = -1;
        for (let i = 0; i < links.length; i++) {
            if (links[i].source === source && links[i].target === target) {
                index = i;
                break;
            }
        }
        return index;
    }

    /**
     * get the clinical data for a sample
     * @param clinicalData
     * @param sampleId
     */
    getSampleClinicalData(clinicalData, sampleId) {
        return clinicalData.filter(function (d, i) {
            return d.sampleId === sampleId;
        })
    }

    /**
     * get tha mutation counts for a sample
     * @param mutationCounts
     * @param sampleId
     * @returns mutation counts of sample
     */
    static getSampleMutationCounts(mutationCounts, sampleId) {
        let counts = -1;
        for (let i = 0; i < mutationCounts.length; i++) {
            if (mutationCounts[i].sampleId === sampleId) {
                counts = mutationCounts[i].mutationCount;
                break;
            }
        }
        return counts;
    }

    /**
     * Gets clinical data from the cBio Portal
     * @returns request
     */
    getClinicalData() {
        return axios.get("http://www.cbioportal.org/api/studies/" + this.studyID + "/clinical-data?clinicalDataType=SAMPLE&projection=SUMMARY&pageSize=10000000&pageNumber=0&direction=ASC");
    }

    /**
     * Gets mutation counts from the cBio Portal
     * @returns {AxiosPromise<any>}
     */
    getMutationCounts() {
        return axios.get("http://www.cbioportal.org/api/molecular-profiles/" + this.studyID + "_mutations/mutation-counts?sampleListId=lgg_ucsf_2014_all");
    }

}

export default ObservableParser;