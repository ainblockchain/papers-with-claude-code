// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LearningLedger {
    struct Enrollment {
        uint256 enrolledAt;
        uint256 currentStage;
        uint256 totalPaid;
        bool isActive;
    }

    struct StageCompletion {
        uint256 completedAt;
        uint256 score;
        uint256 amountPaid;
        bytes32 attestationHash;
    }

    // paperId => agent address => Enrollment
    mapping(string => mapping(address => Enrollment)) public enrollments;

    // paperId => agent address => stageNum => StageCompletion
    mapping(string => mapping(address => mapping(uint256 => StageCompletion))) public completions;

    // Events
    event CourseEnrolled(address indexed agent, string paperId, uint256 timestamp);
    event StageCompleted(address indexed agent, string paperId, uint256 stageNum, uint256 score);
    event PaymentReceived(address indexed from, string paperId, uint256 amount);

    /// @notice Enroll in a course with payment
    /// @param paperId The paper/course ID
    function enrollCourse(string calldata paperId) external payable {
        require(msg.value > 0, "Payment required");
        require(!enrollments[paperId][msg.sender].isActive, "Already enrolled");

        enrollments[paperId][msg.sender] = Enrollment({
            enrolledAt: block.timestamp,
            currentStage: 0,
            totalPaid: msg.value,
            isActive: true
        });

        emit CourseEnrolled(msg.sender, paperId, block.timestamp);
        emit PaymentReceived(msg.sender, paperId, msg.value);
    }

    /// @notice Record stage completion with payment
    /// @param paperId The paper/course ID
    /// @param stageNum The completed stage number
    /// @param score Quiz score (0-100)
    function completeStage(
        string calldata paperId,
        uint256 stageNum,
        uint256 score
    ) external payable {
        require(enrollments[paperId][msg.sender].isActive, "Not enrolled");
        require(score <= 100, "Invalid score");
        require(
            completions[paperId][msg.sender][stageNum].completedAt == 0,
            "Stage already completed"
        );

        completions[paperId][msg.sender][stageNum] = StageCompletion({
            completedAt: block.timestamp,
            score: score,
            amountPaid: msg.value,
            attestationHash: keccak256(
                abi.encodePacked(msg.sender, paperId, stageNum, score, block.timestamp)
            )
        });

        enrollments[paperId][msg.sender].currentStage = stageNum;
        enrollments[paperId][msg.sender].totalPaid += msg.value;

        emit StageCompleted(msg.sender, paperId, stageNum, score);
        if (msg.value > 0) {
            emit PaymentReceived(msg.sender, paperId, msg.value);
        }
    }

    /// @notice Get learning progress
    /// @param agent Agent address
    /// @param paperId The paper/course ID
    function getProgress(
        address agent,
        string calldata paperId
    ) external view returns (
        bool isEnrolled,
        uint256 currentStage,
        uint256 totalPaid,
        uint256 enrolledAt
    ) {
        Enrollment memory e = enrollments[paperId][agent];
        return (e.isActive, e.currentStage, e.totalPaid, e.enrolledAt);
    }

    /// @notice Get stage completion details
    /// @param agent Agent address
    /// @param paperId The paper/course ID
    /// @param stageNum Stage number
    function getStageCompletion(
        address agent,
        string calldata paperId,
        uint256 stageNum
    ) external view returns (
        uint256 completedAt,
        uint256 score,
        bytes32 attestationHash
    ) {
        StageCompletion memory sc = completions[paperId][agent][stageNum];
        return (sc.completedAt, sc.score, sc.attestationHash);
    }
}
