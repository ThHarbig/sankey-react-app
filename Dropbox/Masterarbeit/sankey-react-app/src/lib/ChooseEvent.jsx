import React from "react";
import {observer} from "mobx-react";


const ChooseEvent = observer(class ChooseEvent extends React.Component {
    constructor() {
        super();
        this.handleCheckBoxClick = this.handleCheckBoxClick.bind(this);
    }

    getEvents(value) {
        let events = [];
        for (let patient in this.props.dataChange.clinicalEvents) {
            const filtered = this.props.dataChange.clinicalEvents[patient].filter(function (d) {
                return d.eventType === value;
            });
            filtered.sort(function (a, b) {
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
            events.push({"patient": patient, "events": filtered});
        }
        return events;
    }

    handleCheckBoxClick(event) {
        let color = "";
        switch (event.target.value) {
            case "SURGERY":
                color = "green";
                break;
            case "STATUS":
                color = "grey";
                break;
            case "TREATMENT":
                color = "red"
        }
        if (event.target.checked) {
            let newEvents = this.getEvents(event.target.value);
            this.props.dataChange.addEvents(event.target.value, newEvents, color);
        }
        else {
            this.props.dataChange.removeEvents(event.target.value);
        }
    }

    render() {
        return (
            <div>
                <label style={{backgroundColor: "lightgreen"}}>Surgery<input type="checkbox" value="SURGERY"
                                                                             onChange={this.handleCheckBoxClick}/></label>
                <label style={{backgroundColor: "lightgrey"}}>Status<input type="checkbox" value="STATUS"
                                                                           onChange={this.handleCheckBoxClick}/></label>
                <label style={{backgroundColor: "lightcoral"}}>Treatment<input type="checkbox" value="TREATMENT"
                                                                               onChange={this.handleCheckBoxClick}/></label>

            </div>
        );
    }
});
export default ChooseEvent;
