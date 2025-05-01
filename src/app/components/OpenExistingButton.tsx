"use client";

function OpenExistingButton() {
    const handleOpen = async () => {
        const result = await window.electronAPI.openFile();
        if (result) {
            console.log("Opened existing presentation at:", result);
        }
    };

    return (
        <button className="btn btn-secondary" onClick={handleOpen}>
            Open Existing
        </button>
    );
}

export default OpenExistingButton;
