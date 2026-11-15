import test from 'node:test';
import assert from 'node:assert/strict';
import { GameFlow } from './game-flow.js';
import { QUIZ_QUESTIONS } from './quiz-questions.js';

test('exploration continues until the player chooses to proceed',()=>{
  const flow=new GameFlow();
  flow.openReady(); flow.keepExploring(); assert.equal(flow.state,'LEVEL_1_EXPLORE');
  flow.openReady(); flow.startLevel2(); assert.equal(flow.state,'LEVEL_2_TASK');
});

test('each motion task requires neutral, movement, stability, and NEXT',()=>{
  const flow=new GameFlow(); flow.openReady(); flow.startLevel2();
  const pulls=[0,0,0,0,0];
  pulls[1]=1; assert.equal(flow.update(pulls,.2,0),false);
  pulls[1]=0; flow.update(pulls,0,100);
  pulls[1]=.7; assert.equal(flow.update(pulls,.01,200),false);
  assert.equal(flow.update(pulls,.08,300),false);
  assert.equal(flow.update(pulls,.08,630),true);
  assert.equal(flow.update(pulls,.08,1000),false);
  assert.equal(flow.state,'LEVEL_2_FEEDBACK');
  flow.next(); assert.equal(flow.taskIndex,1);
  assert.equal(flow.update(pulls,.2,1400),false);
  pulls[3]=0; flow.update(pulls,0,1500); pulls[3]=.8;
  flow.update(pulls,.08,1600); assert.equal(flow.update(pulls,.08,1930),true);
  flow.next(); assert.equal(flow.taskIndex,2);
  pulls[0]=0; flow.update(pulls,0,2000); pulls[0]=.8;
  flow.update(pulls,.05,2100); assert.equal(flow.update(pulls,.05,2430),true);
  flow.next(); assert.equal(flow.taskIndex,3);
  assert.equal(flow.clickRibs(),true); flow.next(); assert.equal(flow.state,'LEVEL_2_COMPLETE');
});

test('right arm task accepts a moderate ring pull only after the wrist lifts',()=>{
  const flow=new GameFlow(); flow.state='LEVEL_2_TASK'; flow.taskIndex=1;
  const pulls=[0,0,0,0,0]; flow.update(pulls,0,0);
  pulls[3]=.21;
  assert.equal(flow.update(pulls,.03,100),false);
  assert.equal(flow.update(pulls,.05,200),false);
  assert.equal(flow.update(pulls,.05,530),true);
});

test('Skeleton Check enters only after Level 2 and locks each answer',()=>{
  const flow=new GameFlow();
  assert.equal(flow.startSkeletonCheck(),false);
  flow.state='LEVEL_2_COMPLETE';
  assert.equal(flow.startSkeletonCheck(),true);
  assert.equal(flow.state,'SKELETON_CHECK_QUESTION');
  assert.equal(flow.nextQuiz(),false);
  assert.equal(flow.answerQuiz('D'),false);
  assert.equal(flow.answerQuiz('A'),true);
  assert.equal(flow.state,'SKELETON_CHECK_FEEDBACK');
  assert.equal(flow.answerQuiz('B'),false);
  assert.equal(flow.selectedAnswer,'A');
  assert.equal(flow.nextQuiz(),true);
  assert.equal(flow.quizIndex,1);
  assert.equal(flow.selectedAnswer,null);
});

test('four quiz questions support correct and wrong answers, finish, and replay',()=>{
  assert.deepEqual(QUIZ_QUESTIONS.map(q=>q.correctAnswer),['B','A','B','B']);
  const flow=new GameFlow(); flow.state='LEVEL_2_COMPLETE'; flow.startSkeletonCheck();
  for(const [index,choice] of ['B','C','B','A'].entries()) {
    assert.equal(flow.quizIndex,index);
    assert.equal(flow.answerQuiz(choice),true);
    assert.equal(flow.quizQuestion.correctAnswer,QUIZ_QUESTIONS[index].correctAnswer);
    assert.equal(flow.nextQuiz(),true);
  }
  assert.equal(flow.state,'SKELETON_CHECK_COMPLETE');
  assert.equal(flow.nextQuiz(),false);
  assert.equal(flow.playQuizAgain(),true);
  assert.equal(flow.state,'SKELETON_CHECK_QUESTION');
  assert.equal(flow.quizIndex,0);
  assert.equal(flow.selectedAnswer,null);
});
