# Tests in legacy code

## Capture what the system already does

When behavior exists but is undocumented, write a **characterization test** with observable examples
and run it against the current system. It is normal for it to pass on the first attempt: it records
the behavior that must be preserved; it does not try to prove a missing capability.

When you fix a defect or add a new rule, write a **regression test** that represents the required
outcome. That test must fail because of the incorrect behavior before you implement the change.

## Advance by risk and by small slices

1. Identify the code that will change and the outcomes users already observe.
2. Cover the critical paths or the areas that change most often first.
3. Use the available interface. If there is no practical boundary to test, introduce the smallest
   change that makes the behavior observable without redesigning the whole system.
4. Refactor after you have a useful characterization, and keep the tests green.
5. Add the next test near the next change, instead of chasing full coverage before working.

Do not describe a passing characterization test as the RED of TDD. After you pin the existing
behavior, return to the test-first cycle for each new defect or requirement.
