import React from "react";
import {observer} from "mobx-react";


const ChooseEvent = observer(class ChooseEvent extends React.Component {
    constructor() {
        super();
        this.handleCheckBoxClick = this.handleCheckBoxClick.bind(this);
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
                color = "red";
                break;
            default:
                color="black";
        }
        if (event.target.checked) {
            this.props.parser.addEvents(event.target.value, color);
        }
        else {
            this.props.parser.removeEvents(event.target.value);
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
