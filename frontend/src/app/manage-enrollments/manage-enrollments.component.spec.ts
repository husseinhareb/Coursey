import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageEnrollmentsComponent } from './manage-enrollments.component';

describe('ManageEnrollmentsComponent', () => {
  let component: ManageEnrollmentsComponent;
  let fixture: ComponentFixture<ManageEnrollmentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageEnrollmentsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageEnrollmentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
