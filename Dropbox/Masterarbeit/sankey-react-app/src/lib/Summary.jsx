import {observer} from "mobx-react"
import React from "react"

const Summary=observer(class Summary extends React.Component{
    render(){
        const tpP=this.props.dataChange.numberOfTimepoints/this.props.dataChange.numberOfPatients;
        const spPpT=(this.props.dataChange.numberOfSamples/this.props.dataChange.numberOfPatients)/tpP;
        return(
            <div>
                <p>Number of patients: {this.props.dataChange.numberOfPatients}</p>
                <p>Number of samples: {this.props.dataChange.numberOfSamples}</p>
                <p>Average number of timepoints per patient: {Math.round(tpP*100)/100}</p>
                <p>Average number of samples per patient per timepoint: {Math.round(spPpT*100)/100}</p>
            </div>
        )
    }
});
export default Summary;