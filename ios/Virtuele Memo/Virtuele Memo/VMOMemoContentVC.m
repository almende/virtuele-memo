//
//  VMOMemoContentVC.m
//  Virtuele Memo
//
//  Created by Stefan Kroon on 16-04-14.
//  Copyright (c) 2014 Stefan Kroon. All rights reserved.
//

#import "VMOMemoContentVC.h"

@interface VMOMemoContentVC ()

@end

@implementation VMOMemoContentVC {
    IBOutlet UIView *frontSideView;
    IBOutlet UIView *backSideView;
}

- (id)initWithNibName:(NSString *)nibNameOrNil bundle:(NSBundle *)nibBundleOrNil
{
    self = [super initWithNibName:nibNameOrNil bundle:nibBundleOrNil];
    if (self) {
        // Custom initialization
    }
    return self;
}

- (void)viewDidLoad
{
    [super viewDidLoad];
    // Do any additional setup after loading the view.
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

- (IBAction)infoAction:(id)sender {
    //[frontSideView setHidden:YES];
    //[backSideView setHidden:NO];
    [UIView transitionFromView:frontSideView toView:backSideView duration:0.3 options:UIViewAnimationOptionTransitionFlipFromLeft|UIViewAnimationOptionShowHideTransitionViews completion:nil];
    
}

- (IBAction)saveAction:(id)sender {
    //[backSideView setHidden:YES];
    //[frontSideView setHidden:NO];
    [UIView transitionFromView:backSideView toView:frontSideView duration:0.3 options:UIViewAnimationOptionTransitionFlipFromRight|UIViewAnimationOptionShowHideTransitionViews completion:nil];
}

/*
#pragma mark - Navigation

// In a storyboard-based application, you will often want to do a little preparation before navigation
- (void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender
{
    // Get the new view controller using [segue destinationViewController].
    // Pass the selected object to the new view controller.
}
*/

@end
