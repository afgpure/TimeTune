function parseChatGPTResponse(response) {
    // Parse the response JSON or text
    const parsedResponse = JSON.parse(response); // Example assuming response is JSON

    // Extract event details from the parsed response
    const eventName = parsedResponse.eventName;
    const eventDate = parsedResponse.eventDate;
    const eventTime = parsedResponse.eventTime;
    const eventLocation = parsedResponse.eventLocation;
    const eventDescription = parsedResponse.eventDescription;

    // Create a calendar event object
    const calendarEvent = {
        name: eventName,
        date: eventDate,
        time: eventTime,
        location: eventLocation,
        description: eventDescription
    };

    return calendarEvent;
}
module.exports = {
    parseChatGPTResponse: parseChatGPTResponse
};