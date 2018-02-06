class Parser {
    constructor() {
        this.studyId = "";
        this.patientData = {};
        this.counts = {};
        this.numberOfPatients = 0;
        this.numberOfSamples = 0;
        this.numberOfTimepoints = 0;
        this.sankeyCategories = [];
    }
    buildPatientStructure(data) {
        let categories = [];
        let patients = {};
        data.forEach(function (d) {
            const idInformation = Parser.unravelSampleID(d.sampleId);
            if (!(idInformation.patient in patients)) {
                patients[idInformation.patient] = {};
                patients[idInformation.patient]["key"] = d.uniquePatientKey;
                patients[idInformation.patient]["timepoints"] = {};

            }
            if (!(idInformation.timepoint in patients[idInformation.patient]["timepoints"])) {
                patients[idInformation.patient]["timepoints"][idInformation.timepoint] = {}
            }
            if (!(idInformation.sample in patients[idInformation.patient]["timepoints"][idInformation.timepoint])) {
                patients[idInformation.patient]["timepoints"][idInformation.timepoint][idInformation.sample] = {};
                patients[idInformation.patient]["timepoints"][idInformation.timepoint][idInformation.sample]["key"] = d.uniqueSampleKey;
            }
            patients[idInformation.patient]["timepoints"][idInformation.timepoint][idInformation.sample][d.clinicalAttributeId] = d.value;
            if (!categories.includes(d.clinicalAttributeId)) {
                categories.push(d.clinicalAttributeId);
            }


        });
        this.sankeyCategories = categories;
        console.log(patients);
        return (patients);
    }

    addMutationCountsToSamples(patients, mutationCounts) {
        mutationCounts.forEach(function (d, i) {
            const idInformation = Parser.unravelSampleID(d.sampleId);
            patients[idInformation.patient]["timepoints"][idInformation.timepoint][idInformation.sample]["mutationCount"] = d.mutationCount;
        });
        return patients;
    }

    parse(studyId) {
        this.studyId = studyId;
        let patients = this.parseClinicalData();
        let counts = this.parseMutationCounts();
        patients = this.addMutationCountsToSamples(patients, counts);
        this.patientData = patients;
        this.numberOfPatients = Object.keys(patients).length;
        this.numberOfSamples = this.getNumberOfSamples();
        this.numberOfTimepoints = this.getNumberOfTimePoints();
        this.counts = this.getCounts();

    }

    getNumberOfSamples() {
        let counter = 0;
        for (let patient in this.patientData) {
            for (let timepoint in this.patientData[patient]["timepoints"]) {
                counter += Object.keys(this.patientData[patient]["timepoints"][timepoint]).length;
            }
        }
        return counter;
    }

    getNumberOfTimePoints() {
        let counter = 0;
        for (let patient in this.patientData) {
            counter += Object.keys(this.patientData[patient]["timepoints"]).length;
        }
        return counter;
    }


    getCounts() {
        let counts = {};
        const _self = this;
        this.sankeyCategories.forEach(function (category) {
            let links = [];
            let nodes = [];
            for (let patient in _self.patientData) {
                let counter = 0;
                while (counter in _self.patientData[patient]["timepoints"] && (counter + 1) in _self.patientData[patient]["timepoints"]) {
                    const current_state = _self.patientData[patient]["timepoints"][counter]["A"][category] + " (timepoint " + String(counter) + ")";
                    const next_state = _self.patientData[patient]["timepoints"][counter + 1]["A"][category] + " (timepoint " + String(counter + 1) + ")";
                    if (Parser.nodesIndex(current_state, nodes) === -1) {
                        nodes.push({"name": current_state});
                    }
                    if (Parser.nodesIndex(next_state, nodes) === -1) {
                        nodes.push({"name": next_state});
                    }
                    let currSource = Parser.nodesIndex(current_state, nodes);
                    let currTarget = Parser.nodesIndex(next_state, nodes);
                    if (Parser.linksIndex(currSource, currTarget, links) === -1) {
                        links.push({"source": currSource, "target": currTarget, "value": 0})
                    }
                    let currLinkIndex = Parser.linksIndex(currSource, currTarget, links);
                    links[currLinkIndex].value += 1;
                    counter += 1
                }


            }
            counts[category] = {"nodes": nodes, "links": links};
        });
        return counts;
    }

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

    parseClinicalData() {
        const xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET", "http://www.cbioportal.org/api/studies/" + this.studyId + "/clinical-data?clinicalDataType=SAMPLE&projection=SUMMARY&pageSize=10000000&pageNumber=0&direction=ASC", false); // false for synchronous request
        xmlHttp.send(null);
        const data = JSON.parse(xmlHttp.responseText);
        return this.buildPatientStructure(data);
    }

    parseMutationCounts() {
        const xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET", "http://www.cbioportal.org/api/molecular-profiles/" + this.studyId + "_mutations/mutation-counts?sampleListId=lgg_ucsf_2014_all", false);
        xmlHttp.send(null);
        return (JSON.parse(xmlHttp.responseText));
    }

    static unravelSampleID(sampleID) {
        let splitted = sampleID.split("_");
        let idDict = {};
        idDict["patient"] = splitted[0];
        idDict["timepoint"] = Parser.getTimepoint(splitted[1]);
        if (splitted.length === 3) {
            idDict["sample"] = splitted[2];
        }
        else idDict["sample"] = "A";
        return (idDict)
    }

    static getTimepoint(rawTimepoint) {
        const name = rawTimepoint.replace(/\d/g, "");
        let number = rawTimepoint.match(/\d/g);
        if (number != null) {
            number = number.join("");
        }
        if (name === "Pri") {
            return 0;
        }
        else if (number == null) {
            return 1
        }
        return Number.parseInt(number,10);
    }
}

export default Parser;