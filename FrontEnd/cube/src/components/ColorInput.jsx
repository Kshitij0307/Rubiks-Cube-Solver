import { useRef, useState } from "react";

function ColorInput() {
    // Create refs for each input
    const faceRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
    const [error, setError] = useState(["","","","","",""]);

    // Face details: color and label
    const faces = [
        { label: 'Face 1 (W)', color: '#ffffff' },
        { label: 'Face 2 (R)', color: '#ff0000' },
        { label: 'Face 3 (G)', color: '#008000' },
        { label: 'Face 4 (O)', color: '#ff7f00' },
        { label: 'Face 5 (B)', color: '#0000ff' },
        { label: 'Face 6 (Y)', color: '#ffff00' },
    ];

    const validColors = ['R', 'G', 'B', 'Y', 'O', 'W'];

    const handleSubmit = (event) => {
        event.preventDefault();
        
        const colors = faceRefs.map(ref => ref.current.value.toUpperCase()); // Convert to uppercase for validation
        const newErrors = [];
        let errorFound = false;
        
        colors.forEach((color, idx) => {
            // Check if input is 9 characters long
            if (color.length !== 9) {
                newErrors[idx] = "9 Colors required";
                errorFound = true;
            } 
            // Check if input contains only valid characters
            else if (![...color].every(char => validColors.includes(char))) {
                newErrors[idx] = "Only R, G, B, Y, O, W are allowed";
                errorFound = true;
            } 
            else {
                newErrors[idx] = ""; // Clear any previous errors for valid input
            }
        });

        setError(newErrors); // Update the error state
        
        if (!errorFound) {
            console.log("Successful"); 
        } else {
            console.log("Invalid Input"); 
        }
    };

    return (
        <>
            <div className="container mt-4">
                <div className="alert alert-info text-center">
                    Please provide the Color codes for each Face of the cube
                </div>
                <div className="text-center" style={{ backgroundColor: '#e2e3e5', padding: '10px', borderRadius: '5px', fontSize: '14px', marginTop: '5px', border: '1px solid #d3d3d3' }}>
                    Use the following codes (without spaces): <strong>R</strong> for Red, <strong>B</strong> for Blue, <strong>Y</strong> for Yellow, <strong>G</strong> for Green, <strong>O</strong> for Orange, <strong>W</strong> for White.
                </div>
            </div>

            <br />

            <form onSubmit={handleSubmit}>
                {faces.map((face, index) => (
                    <div className="input-group input-group-sm mb-3" key={index}>
                        <span className="input-group-text face" id={`face${index + 1}`} style={{ backgroundColor: '#444444', color: face.color }}>
                            {face.label}
                        </span>
                        <input
                            type="text"
                            className="form-control"
                            style={{ backgroundColor: '#333333', color: '#ffffff' }}
                            ref={faceRefs[index]} // Assign ref
                        />
                        {error[index] !== "" && <div className="error-callout" style={{ marginTop: '5px' }}>{error[index]}</div>}
                    </div>
                ))}

                <div className="text-center mt-4">
                    <button type="submit" className="submit-button">
                        Submit Colors
                    </button>
                </div>
            </form>
        </>
    );
}

export default ColorInput;
