import {extendObservable} from "mobx";
import axios from 'axios';


class ObservableParser {
    constructor() {
        this.studyID = "";
        this.patients = [];
        this.sampleStructure = {};
        this.clinicalEvents = {};
        this.countsPerTP = {};

        extendObservable(this, {

            parsed: false,
            //data for Summary
            numberOfTimepoints: 0,
            numberOfSamples: 0,
            numberOfPatients: 0,

            //data for Histogram
            PriHistogramData: [],
            RecHistogramData: [],

            //data for Timeline
            sampleEvents: [],
            currentEvents: [],
            attributes: {},
            patientAttributes:{},
            patientAttributeCategories:{},

            //data for Sankey
            clinicalCategories: [],
            currentSankeyData: {}
        });
    }


    parse(studyID) {
        this.studyID = studyID;
        /**
         * get patient information first
         */
        axios.get("http://www.cbioportal.org/api/studies/" + this.studyID + "/patients?projection=SUMMARY&pageSize=10000000&pageNumber=0&direction=ASC")
            .then(response => {
                this.patients = response.data;
                this.numberOfPatients = this.patients.length;
                let _self = this;
                let clinicalEventRequests = [];
                let patientDataRequests = [];
                /**
                 * get clinical events for all the patients
                 */
                this.patients.forEach(function (patient) {
                    clinicalEventRequests.push(axios.get("http://www.cbioportal.org/api/studies/" + _self.studyID + "/patients/" + patient.patientId + "/clinical-events?projection=SUMMARY&pageSize=10000000&pageNumber=0&sortBy=startNumberOfDaysSinceDiagnosis&direction=ASC"));
                    patientDataRequests.push(axios.get("http://www.cbioportal.org/api/studies/" + _self.studyID + "/patients/" + patient.patientId + "/clinical-data?projection=SUMMARY&pageSize=10000000&pageNumber=0&direction=ASC"));
                });
                axios.all(clinicalEventRequests)
                    .then(function (eventResults) {
                        eventResults.forEach(function (response2, i) {
                            _self.clinicalEvents[_self.patients[i].patientId] = response2.data;
                        });
                        axios.all(patientDataRequests)
                            .then(function (patientDataResults) {
                                _self.setPatientAttributes(patientDataResults);
                                console.log(_self.patientAttributes,_self.patientAttributeCategories);

                                /**
                                 * get clinical data and mutation counts
                                 */
                                axios.all([_self.getClinicalData(), _self.getMutationCounts()])
                                    .then(axios.spread(function (clinicalData, mutationCounts) {
                                        _self.buildPatientStructure(clinicalData.data, mutationCounts.data);
                                        _self.createSankeyData();
                                        _self.numberOfSamples = mutationCounts.data.length;
                                        _self.sampleEvents = {
                                            "type": "SPECIMEN",
                                            "events": _self.getEvents("SPECIMEN", []),
                                            "color": "blue"
                                        };
                                        _self.setCurrentSankeyData(_self.clinicalCategories[0]);
                                        _self.parsed = true;
                                        _self.computeAttributes();
                                    }));
                            })
                    })
            })

    }
    setPatientAttributes(patientData){
        let patientAttributes={};
        let patientAttributeCategories=[];
        patientData.forEach(function (attributes,i) {
            patientAttributes[attributes.data[0].patientId]={};
            attributes.data.forEach(function (attribute) {
                patientAttributes[attributes.data[0].patientId][attribute.clinicalAttributeId]=attribute.value;
                if(i===0){
                    patientAttributeCategories.push(attribute.clinicalAttributeId);
                }
            })
        });
        this.patientAttributes=patientAttributes;
        this.patientAttributeCategories=patientAttributeCategories;
    }
    /**
     * gets events of one type ("STATUS","SPECIMEN","TREATMENT",...)
     * @param value
     * @param filters
     * @returns events of one type
     */
    getEvents(value, filters) {
        let events = [];
        const _self = this;
        for (let patient in this.clinicalEvents) {
            const filtered = this.clinicalEvents[patient].filter(function (d) {
                return d.eventType === value && ObservableParser.attributesMatch(d.attributes, filters);
            });
            events.push({"patient": patient, "events": filtered});
        }
        return events;
    }

    /**
     * or filter
     * @param attributes
     * @param searchAttributes
     * @returns {*}
     */
    static attributesMatch(attributes, searchAttributes) {
        let hasAttribute;
        for (let i = 0; i < attributes.length; i++) {
            hasAttribute = false;
            for (let j = 0; j < searchAttributes.length; j++) {
                if (searchAttributes[j].key === attributes[i].key && searchAttributes[j].value === attributes[i].value) {
                    hasAttribute = true;
                    break;
                }
            }
            if (hasAttribute === true) {
                break;
            }
        }
        if (searchAttributes.length === 0) {
            hasAttribute = true;
        }
        return hasAttribute;
    }

    computeAttributes() {
        let attributes = {};
        for (let patient in this.clinicalEvents) {
            this.clinicalEvents[patient].forEach(function (d, i) {
                if (!(d.eventType in attributes)) {
                    attributes[d.eventType] = {}
                }
                d.attributes.forEach(function (f, j) {
                    if (!(f.key in attributes[d.eventType])) {
                        attributes[d.eventType][f.key] = [];
                        attributes[d.eventType][f.key].push(f.value);
                    }
                    else {
                        if (!attributes[d.eventType][f.key].includes(f.value)) {
                            attributes[d.eventType][f.key].push(f.value);
                        }
                    }
                })
            })
        }
        this.attributes = attributes;
    }

    /**
     * add event to current events
     * @param value
     * @param color
     */
    addEvents(value, filter, color) {
        let oldEvents = this.currentEvents.slice();
        oldEvents.push({"type": value, "events": this.getEvents(value, filter), "color": color});
        this.currentEvents = oldEvents;
    }

    /**
     * remove event from current events
     * @param type
     */
    removeEvents(type) {
        let currentEvents = [];
        this.currentEvents.forEach(function (d) {
            if (d.type !== type) {
                currentEvents.push(d);
            }
        });
        this.currentEvents = currentEvents;
    }

    /**
     * sets current sankey dataset
     * @param category
     */
    setCurrentSankeyData(category) {
        this.currentSankeyData = this.countsPerTP[category];
    }

    /**
     * combines clinical events of sort "SPECIMEN" and clinical data in one datastructure,
     * creates dataset for histogram of mutation counts
     * @param clinicalData
     * @param mutationCounts
     */
    buildPatientStructure(clinicalData, mutationCounts) {
        const _self = this;
        let sampleStructure = {};
        let clinicalCat = [];
        this.patients.forEach(function (d) {
            sampleStructure[d.patientId] = {"timepoints": {}};
            let previousDate = -1;
            let currTP = 0;
            _self.clinicalEvents[d.patientId].forEach(function (e, i) {
                if (e.eventType === "SPECIMEN" && e.attributes.length === 2) {
                    _self.numberOfTimepoints += 1;
                    if (e.startNumberOfDaysSinceDiagnosis === 0) {
                        _self.PriHistogramData.push(ObservableParser.getSampleMutationCounts(mutationCounts, e.attributes[1].value));
                    }
                    else {
                        _self.RecHistogramData.push(ObservableParser.getSampleMutationCounts(mutationCounts, e.attributes[1].value));
                    }
                    let sampleInfo = {"clinicalData": {}, "name": e.attributes[1].value};
                    let sampleClinicalData = _self.getSampleClinicalData(clinicalData, e.attributes[1].value);
                    sampleClinicalData.forEach(function (f, i) {
                        if (clinicalCat.indexOf(f.clinicalAttributeId) === -1) {
                            clinicalCat.push(f.clinicalAttributeId);
                        }
                        sampleInfo.clinicalData[f.clinicalAttributeId] = f.value;
                    });
                    if (e.startNumberOfDaysSinceDiagnosis !== previousDate) {
                        sampleStructure[d.patientId].timepoints[currTP] = [];
                        sampleStructure[d.patientId].timepoints[currTP].push(sampleInfo);
                        currTP += 1;
                    }
                    else {
                        sampleStructure[d.patientId].timepoints[currTP - 1].push(sampleInfo);
                    }
                    previousDate = e.startNumberOfDaysSinceDiagnosis;
                }
            })
        });
        this.sampleStructure = sampleStructure;
        this.clinicalCategories = clinicalCat;

    }

    /**
     * creates data for sankey diagram
     */
    createSankeyData() {
        let counts = {};
        const _self = this;
        this.clinicalCategories.forEach(function (category) {
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