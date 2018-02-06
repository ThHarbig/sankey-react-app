import React from "react";
import {observer} from "mobx-react";
import Parser from "./utils/Parser.jsx";


const GetStudy = observer(class GetStudy extends React.Component {
    constructor() {
        super();
        GetStudy.getStudy = GetStudy.getStudy.bind(this);
    }

    static getStudy(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            const parser = new Parser();
            parser.parse(event.target.value);
            this.props.dataChange.setNumPatients(parser.numberOfPatients);
            this.props.dataChange.setNumSamples(parser.numberOfSamples);
            this.props.dataChange.setPatientData(parser.patientData);
            this.props.dataChange.setNumTimepoints(parser.numberOfTimepoints);
            this.props.dataChange.setSankeyCategories(parser.sankeyCategories);
            this.props.dataChange.setCounts(parser.counts);
            this.props.dataChange.setParsed(true);
            this.props.dataChange.setSankeyData(parser.counts[parser.sankeyCategories[0]])
        }
    }

    render() {
        return (
            <div>
                <label className="menu">
                    Enter study name:
                    <input type="text" defaultValue="lgg_ucsf_2014" style={{horizontalAlign: "middle"}} onKeyUp={GetStudy.getStudy}/>
                </label>
            </div>
        );
    }
});
export default GetStudy;
